// Adds only the supplied, reviewed SOULI egress addresses. No existing rule is removed.
targetScope = 'resourceGroup'
param serverName string
@minLength(1)
@maxLength(200)
param ranges array
resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2025-08-01' existing = {
  name: serverName
}
@batchSize(32)
resource rules 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2025-08-01' = [for item in ranges: {
  parent: server
  name: item.name
  properties: {
    startIpAddress: item.start
    endIpAddress: item.end
  }
}]
