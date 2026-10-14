// Manual deployment only. No DNS cutover, IAM grants, database creation or GCP deletion.
targetScope = 'resourceGroup'

param location string = 'koreacentral'
param appName string = 'souli-beta'
param environmentName string = 'souli-env'

@description('Private ACR image pinned with @sha256:, never :latest.')
param image string
param registryServer string
param registryUsername string
@secure()
param registryPassword string

@description('Dedicated SOULI database/user, with sslmode=verify-full. Never another application database or its admin account.')
@secure()
param databaseUrl string

@minLength(1)
@description('Explicit beta wallets. An empty list must never open public holder sign-in.')
param betaWallets array

@description('Explicit frontend origin: https://souli.net after cutover. Empty is only for an initial generated-host preview.')
param publicOrigin string

@description('Explicit current ingress customDomains, including certificateId/bindingType. Required to prevent later deployments from silently dropping api.souli.net. Use [] only for an initial app without domains.')
param customDomains array

var tags = {
  project: 'souli'
  environment: 'beta'
  deployment: 'manual'
}

resource environment 'Microsoft.App/managedEnvironments@2025-07-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    // No persistent log destination. This provider requires omission, not the string 'none'.
    // Streaming logs remain available; log ingestion is a separate cost decision.
    workloadProfiles: [{ name: 'Consumption', workloadProfileType: 'Consumption' }]
    zoneRedundant: false
  }
}

resource app 'Microsoft.App/containerApps@2025-07-01' = {
  name: appName
  location: location
  tags: tags
  properties: {
    managedEnvironmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        allowInsecure: false
        customDomains: customDomains
      }
      secrets: [
        { name: 'database-url', value: databaseUrl }
        { name: 'registry-password', value: registryPassword }
      ]
      registries: [{ server: registryServer, username: registryUsername, passwordSecretRef: 'registry-password' }]
    }
    template: {
      terminationGracePeriodSeconds: 30
      containers: [{
        name: 'souli'
        image: image
        resources: { cpu: json('0.25'), memory: '0.5Gi' }
        env: [
          { name: 'NODE_ENV', value: 'production' }
          { name: 'HOST', value: '0.0.0.0' }
          { name: 'PORT', value: '8080' }
          { name: 'STORE_BACKEND', value: 'postgres' }
          { name: 'DATABASE_URL', secretRef: 'database-url' }
          { name: 'PUBLIC_ORIGIN', value: empty(publicOrigin) ? 'https://${appName}.${environment.properties.defaultDomain}' : publicOrigin }
          { name: 'BETA_ALLOWLIST', value: join(betaWallets, ',') }
          { name: 'BASE_RPC_URL', value: 'https://base-rpc.publicnode.com' }
        ]
        probes: [
          { type: 'Startup', httpGet: { path: '/api/health/live', port: 8080 }, periodSeconds: 5, timeoutSeconds: 3, failureThreshold: 30 }
          { type: 'Liveness', httpGet: { path: '/api/health/live', port: 8080 }, periodSeconds: 30, timeoutSeconds: 3, failureThreshold: 3 }
          { type: 'Readiness', httpGet: { path: '/api/health/ready', port: 8080 }, periodSeconds: 30, timeoutSeconds: 5, failureThreshold: 3 }
        ]
      }]
      scale: {
        minReplicas: 0
        maxReplicas: 2
        rules: [{ name: 'http', http: { metadata: { concurrentRequests: '20' } } }]
      }
    }
  }
}

output previewUrl string = 'https://${app.properties.configuration.ingress.fqdn}'
output appResourceId string = app.id
output environmentResourceId string = environment.id
output domainVerificationId string = app.properties.customDomainVerificationId
output domainIp string = environment.properties.staticIp

