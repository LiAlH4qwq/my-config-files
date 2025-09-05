const main = (config) => {
  const allProxyNames = config.proxies.map(proxy => proxy.name)
  const hongkongProxyNames = allProxyNames.filter(proxyName => proxyName.startsWith("🇭🇰") && !proxyName.toLowerCase().includes("direct"))
  const hongkongAutoProxyGroup = buildAutoProxyGroup("Hong Kong", hongkongProxyNames)
  const taiwanProxyNames = allProxyNames.filter(proxyName => proxyName.startsWith("🇹🇼"))
  const taiwanAutoProxyGroup = buildAutoProxyGroup("Taiwan", taiwanProxyNames)
  const metaProxyNames = [
    hongkongAutoProxyGroup.name,
    taiwanAutoProxyGroup.name,
    ...allProxyNames
  ]
  const metaProxyGroup = {
    name: "Meta",
    type: "select",
    proxies: metaProxyNames
  }
  const newProxyGroups = [
    metaProxyGroup,
    hongkongAutoProxyGroup,
    taiwanAutoProxyGroup
  ]
  const fixedBaseRules = config.rules.map(rule => rule.endsWith(",Alink") ? `${rule.slice(0, -5)}Meta` : rule).map(rule => rule.endsWith(",Alink,no-resolve") ? `${rule.slice(0, -16)}Meta,no-resolve` : rule)
  const newRules = [
    "PROCESS-NAME,qbittorrent,DIRECT",
    "GEOSITE,category-ai-!cn,Taiwan Auto",
    "PROCESS-NAME,StarRail.exe,DIRECT",
    "GEOSITE,cn,DIRECT",
    ...fixedBaseRules
  ]
  const newConfig = {
    ...config,
    rules: newRules,
    "proxy-groups": newProxyGroups
  }
  return newConfig
}

const buildAutoProxyGroup = (name, proxies) => {
  return {
    name: `${name} Auto`,
    type: "url-test",
    proxies
  }
}
