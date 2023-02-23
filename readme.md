# TODO: This is out of date
## Nutanix Foundation Rest API

This module is written to consume Foundation Rest API.

### TO USE:

> const foundation = require('nutanix_foundation')

### TO START A FOUNDATION PROCESS PASS IN THE FOLLOWING INFORMATION:
>     foundation.imageCluster(foundationIP, cluster, nodes, hypervisor, aos, advanced)
>     .then(imageResult => {
>           console.log(imageResult)
>     })
>     .catch(err => {
>           console.log(err)
>     })

>     var foundationIP = string
>     var cluster = {
>           name: string,
>           subnet: string,
>           gateway: string,
>           nameserver: string,
>           externalIP: string,
>           ipmiSubnet: string,
>           ipmiUser: string, // optional
>           ipmiPass: string, // optional
>           xs_master_username = string, // optional, required if xenserver and non-default pw
>           xs_master_password = string, // optional, required if xenserver and non-default pw
>     }

>     var nodes = [
>           {
>                 blockID: string,
>                 model: string,
>                 serial: string,
>                 position: string,
>                 nodeID: string,
>                 svmIP: string,
>                 hyperIP: string,
>                 ipmiIP: string,
>                 ipmiMac: string // optional - required if advanced.configureIPMI true
>           }
>     ]

>     var hypervisor = {
>           os: string, // optional
>           filename: string,
>           type: string //optional
>     }

>     var aos = string

>     // ALL OPTIONAL
>     var advanced = {
>           nodesToAdd: number,
>           ramGB: number,
>           configureIPMI: boolean,
>           snbt: boolean,
>           ucs: object {
>                 ucsmIP: string,
>                 ucsmUser: string,
>                 ucsmPassword: string
>           }
>     }

### TO MONITOR A FOUNDATION SERVERS STATUS / PROGRESS:

>     foundation.status(foundationIP)
>     .then(statusResult => {
>           console.log(statusResult)
>     })
>     .catch(err => {
>           console.log(err)
>     })
