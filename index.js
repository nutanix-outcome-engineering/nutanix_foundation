const axios = require('axios')
const _ = require('lodash')
const MockAdapter = require('axios-mock-adapter')

class Foundation {
  constructor(ip, { logger, timeout=55000, mock=false }) {
    this.ip = ip
    this.logger = logger || null

    /** @private */
    this._client = axios.create({
      baseURL: `http://${this.ip}:8000/foundation/`,
      timeout,
      headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'chunked',
          'Accept': 'application/json'
      },
    })

    if (mock) {
      /** @private */
      this._mockAdapter = new MockAdapter(this._client)
      this._setupMockAdapter()
    }
  }

  /**
   *
   * @param {Object} clusterInfo
   * @param {Object[]} nodes
   * @param {Object} hypervisor - Hypervisor details. If it is null it is treated as using the Bundled AHV.
   * @param {string} [hypervisor.os] - Hypervisor OS. If it is null it is treated as using the Bundled AHV.
   * @param {string} [hypervisor.type] - The type of hypervisor. If it is null it is treated as using the Bundled AHV.
   * @param {string} [hypervisor.sku] - HyperV SKU. Only used if {@link [hypervisor.type]} is hyperv
   * @param {string} hypervisor.filename - Filename of the hypervisor installer ISO.
   * @param {string} aos - Filename of the AOS bundle to use.
   * @param {Object} advanced - Advanced foundation parameters
   * @param {number} [advanced.numberOfNodesToBuildClusterWith] - The number of nodes to form a cluster with.
   * @param {boolean} [advanced.configureIPMI] - Configure IPMI before imaging the nodes.
   * @param {object} [advanced.ucs] - Details when imaging UCS.
   * @param {number} [advanced.cvmRamInGB] - Memory to deploy the CVM with. Leave null, undefined, or 0 to use Foundation recommended defaults.
   * @param {number} [advanced.rf] - Value to set the clsuter redundancy factor to.
   * @param {boolean} formCluster
   * @returns {Object}
   */
  generateImageNodePayload(clusterInfo, nodes, hypervisor, aos, advanced, formCluster) {
    let blocks = []
    let blockCount = -1
    let blockID = 'none'
    let allSVM = []
    let numNodesToFormCluster = nodes.length
    let initNodes = true, initCluster = false
    if (advanced.numberOfNodesToBuildClusterWith) {
      numNodesToFormCluster = advanced.numberOfNodesToBuildClusterWith
    }
    if (formCluster) {
      initNodes = false
      initCluster = true
    }
    for (let nodeCount = 0; nodeCount < nodes.length; nodeCount++) {
      if (nodeCount < numNodesToFormCluster) {
        allSVM.push(nodes[nodeCount].svmIP)
      }
      // CREATE BLOCKS AND NODES
      if (blockID != nodes[nodeCount].blockID) {
        blockID = nodes[nodeCount].blockID
        blocks.push({
          block_id: '',
          model: '',
          nodes: []
        })
        blockCount++
      }
      blocks[blockCount].block_id = nodes[nodeCount].blockID
      blocks[blockCount].model = nodes[nodeCount].model
      blocks[blockCount].nodes.push({
        ipmi_ip: nodes[nodeCount].ipmiIP,
        ipmi_mac: nodes[nodeCount].ipmiMac || null,
        ipmi_user: nodes[nodeCount].ipmiUsername || 'ADMIN',
        ipmi_password: nodes[nodeCount].ipmiPassword || 'ADMIN',
        ipmi_configure_now: advanced.configureIPMI || false,
        // A null hypervisor means "bundled AHV", which is treated as kvm.
        hypervisor: hypervisor === null ? 'kvm' : hypervisor.os,
        hypervisor_ip: nodes[nodeCount].hypervisorIP,
        hypervisor_hostname: clusterInfo.name + '-' + (nodeCount + 1),
        ipmi_configure_successful: true,
        node_position: nodes[nodeCount].position,
        ucsm_managed_mode: (advanced.ucs) || null,
        ucsm_node_serial: nodes[nodeCount].serial || null,
        // Hypervisor can be null (bundled AHV), so we need to make sure it's
        // truthy before reading properties off the object
        xen_config_type: (hypervisor && hypervisor.type == 'xen') || null,
        image_successful: false,
        image_now: initNodes,
        cvm_gb_ram: Number(advanced.cvmRamInGB) || undefined,
        cvm_ip: nodes[nodeCount].svmIP,
        node_serial: nodes[nodeCount].serial
      })
    }
    // FORM THE FINAL STRUCTURE
    let payload = {
      hypervisor_netmask: clusterInfo.subnet,
      hypervisor_gateway: clusterInfo.gateway,
      hypervisor_nameserver: clusterInfo.nameserver,
      rdma_passthrough: clusterInfo.rdmaEnabled ? true : false,
      ipmi_configure_now: advanced.configureIPMI || false,
      ipmi_netmask: nodes[0].ipmiSubnet,
      ipmi_gateway: nodes[0].ipmiGateway,
      nos_package: aos,
      hypervisor_iso: {},
      hyperv_sku: (hypervisor && hypervisor.os == 'hyperv') ? hypervisor.sku : undefined,
      skip_hypervisor: false,
      cvm_netmask: clusterInfo.subnet,
      cvm_gateway: clusterInfo.gateway,
      use_foundation_ips: false,
      clusters: [{
        // Breaking this into a two step process.
        cluster_init_now: initCluster,
        cluster_name: clusterInfo.name,
        cluster_external_ip: clusterInfo.externalIP,
        cluster_members: allSVM,
        single_node_cluster: allSVM.length == 1,
        redundancy_factor: (allSVM.length == 1) ? 1 : null,
        cvm_dns_servers: clusterInfo.nameserver,
        cvm_ntp_servers: clusterInfo.ntpServer || clusterInfo.nameserver,
        hypervisor_ntp_servers: clusterInfo.ntpServer || clusterInfo.nameserver
      }],
      blocks: blocks,
      tests: {
        run_diagnostics: false,
        run_ncc: false
      }
    }


    if (advanced.rf) { payload.clusters[0].redundancy_factor = advanced.rf }

    // If hypervisor is null, it means we're doing bundled AHV. To tell Foundation
    // to use the bundled AHV version with AOS, you can set hypervisor_iso to an empty
    // object and set hypervisor to 'kvm'.

    if (hypervisor === null) {
      payload.hypervisor_iso = {}
      payload.hypervisor = 'kvm'
    } else {
      payload.hypervisor_iso[hypervisor.os] = hypervisor.filename
    }

    if (advanced.ucs) {
      payload.ucsm_ip = advanced.ucs.ucsmIP
      payload.ucsm_user = advanced.ucs.ucsmUser
      payload.ucsm_password = advanced.cluster.ucsmPassword
    }
    if (hypervisor && hypervisor.type == 'xen') {
      payload.xs_master_ip = nodes[0].hypervisorIP,
        payload.xs_master_username = clusterInfo.xs_master_username || 'root'
      payload.xs_master_password = clusterInfo.xs_master_username || 'nutanix/4u'
    }

    return payload
  }

  /**
   *
   * See {@link generateImageNodePayload} for parameter information.
   * @returns {Object}
   */
  async imageNodes(cluster, nodes, hypervisor, aos, advanced, formCluster) {
    let payload = generateImageNodePayload(cluster, nodes, hypervisor, aos, advanced, formCluster)

    if (advanced.configureIPMI) {
      await this.ipmiConfig(cluster, nodes, hypervisor, aos, advanced, formCluster)
    }

    return (this._client.post('/image_nodes', payload)).data
  }

  /**
   * Configures the IPMI interfaces on requested nodes.
   */
  async ipmiConfig(cluster, nodes, hypervisor, aos, advanced, formCluster) {
    let payload = generateImageNodePayload(cluster, nodes, hypervisor, aos, advanced, formCluster)

    return (this._client.post('/ipmi_config', payload)).data
  }

  /**
   * Check status of the foundation server.
   * @returns {object} - Object containing progress of the foundation server.
   */
  async progress() {
    return (await this._client.get('/progress')).data
  }

  /**
   * Gets the node imaging logs.
   *
   * @param {*} foundationIP
   * @param {*} nodeIP
   * @param {*} sessionID
   * @returns
   */
  async getNodeLog(nodeIP, sessionID = undefined) {
    let response = (this._client.get('/node_log', { params: { hypervisor_ip: nodeIP, session_id: sessionID }})).data
    return {
      ip: nodeIP,
      logContents: response,
      type: "node"
    }
  }

  /**
   * Gets the cluster formation logs.
   * @param {*} clusterIP
   * @param {*} sessionID
   * @returns
   */
  async getClusterLog(clusterIP, sessionID = undefined) {
    let response = (this._client.get('/cluster_log', { params: { cvm_ip: clusterIP, session_id: sessionID }})).data
    return {
      ip: clusterIP,
      logContents: response,
      type: "cluster"
    }
  }

  /**
   * Discover nodes running AOS.
   *
   * @param {Object} filterOptions - Options to filter the disscovered nodes.
   * @param {boolean} [filterOptions.includeConfigured] - Include configured nodes in the return value.
   * @param {string} [filterOptions.blockSN] - Filter by block serial number.
   * @param {*} [filterOptions] -
   * @param {Object} fetchExtra - Fetch extra info about each node
   * @param {boolean} [fetchExtra.fetchNetworkInfo] - Fetch network information about each node
   * @param {*} [fetchExtra] -
   * @returns
   */
  async discoverNodes(filters={}, fetchExtra={}) {
    let {
      includeConfigured = false,
      blockSN
    } = filters
    let {
      fetchNetworkInfo=false
    } = fetchExtra

    const resp = await this._client.get('/discover_nodes')
    let blocks = resp.data
    if (blockSN) {
      blocks = _.filter(blocks, {'block_id': blockSN})
    }
    if (blocks.length == 0) {
      return []
    }

    if (!includeConfigured) {
      blocks.forEach(block => {
        block.nodes = _.filter(block.nodes, ['configured', includeConfigured])
      })
    }

    if (fetchNetworkInfo) {
      let nodeArr = []
      for (let block of blocks) {
        for(let node of block.nodes) {
          nodeArr.push({"ipv6_address": node.ipv6_address})
        }
      }
      let netDetails = await this.nodeNetworkDetailsArray(nodeArr)
      // TODO: make this more efficient
      for (let block of blocks) {
        for (let nodeIdx in block.nodes) {
          for (let netDetailsIdx in netDetails) {
            if (block.nodes[nodeIdx].ipv6_address == netDetails[netDetailsIdx].ipv6_address) {
              _.merge(block.nodes[nodeIdx], netDetails[netDetailsIdx])
            }
          }
        }
      }
    }

    this?.logger?.debug(blocks)

    return blocks
  }

  async nodeNetworkDetails(ipv6Addr, timeout=45) {
    return await this.nodeNetworkDetailsArray([{"ipv6_address": ipv6Addr}], timeout)
  }

  async nodeNetworkDetailsArray(nodes, timeout=45) {
    const resp = await this._client.post('/node_network_details', {
      "nodes": nodes,
      "timeout": `${timeout}`
    })

    this?.logger?.debug(resp.data)

    return resp.data.nodes
  }

  /** @private */
  _setupMockAdapter() {
    this._mockAdapter.onGet('/discover_nodes').reply(200, require('./test/mockData/discoverNodesRaw.json'))
    this._mockAdapter.onPost('/node_network_details').reply(200, require('./test/mockData/nodeNetworkDetails.json'))
  }
}
module.exports = Foundation
