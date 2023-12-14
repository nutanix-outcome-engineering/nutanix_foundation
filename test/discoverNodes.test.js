const Foundation = require('../index.js')


describe('Discover Nodes Tests', () => {
  const fvm = new Foundation("10.38.43.50", {mock: true})

  test('discover nodes using defaults', async () => {
    let discovered = await fvm.discoverNodes()

    expect(discovered).toStrictEqual(require('./mockData/discoverNodesDefaultSettings.json'))
  })

  test('discover nodes using including configured', async () => {
    let discovered = await fvm.discoverNodes({includeConfigured: true})

    expect(discovered).toStrictEqual(require('./mockData/discoverNodesRaw.json'))
  })

  test('discover nodes fetching network details for unconfigured nodes', async () => {
    let discovered = await fvm.discoverNodes({includeConfigured: false}, {fetchNetworkInfo: true})

    expect(discovered).toStrictEqual(require('./mockData/discoverNodesIncludeNetworkDetails.json'))
  })

  test('discover node filtering by bmc ip', async () => {
    let discovered = await fvm.discoverNodes({ipmiIP: '10.38.43.33'})

    expect(discovered).toStrictEqual(require('./mockData/discoverNodesFilterByBMCIP.json'))
  })

  test('discover node + network details with filtering by ipv6Address', async () => {
    let discovered = await fvm.discoverNodes({ipv6Address: 'fe80::20c:29ff:fe64:d8a2'}, {fetchNetworkInfo: true})

    expect(discovered).toStrictEqual(require('./mockData/discoverNodesFilterByIpv6Address.json'))
  })
})
