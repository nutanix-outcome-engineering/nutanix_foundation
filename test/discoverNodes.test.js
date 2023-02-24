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
})
