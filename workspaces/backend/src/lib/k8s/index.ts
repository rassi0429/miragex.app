// export const createPodSpec = (repoUrl: string, envVars = {}) => {
//   const repositoryName = repoUrl.split('/').pop()?.split('.').shift()?.toLowerCase()
//   const podName = `${repositoryName}-${Date.now()}`;
//
//   // 受け取った envVars オブジェクトを k8s 用の配列形式に変換
//   const envArray = Object.entries(envVars).map(([key, value]) => ({
//     name: key,
//     value: String(value)
//   }));
//
//   return {
//     apiVersion: 'v1',
//     kind: 'Pod',
//     metadata: {
//       name: podName,
//       labels: {
//         app: podName
//       }
//     },
//     spec: {
//       restartPolicy: 'Always',
//       volumes: [
//         {
//           name: 'app-volume',
//           emptyDir: {}
//         }
//       ],
//       initContainers: [
//         {
//           name: 'git-clone',
//           image: 'alpine/git:latest',
//           command: ['sh', '-c'],
//           args: [
//             `[ -d "/app/.git" ] && (echo "Repository already exists. Pulling latest changes..." && git -C /app pull) || (echo "Repository not found. Cloning..." && git clone ${repoUrl} /app)`
//           ],
//           volumeMounts: [
//             {
//               name: 'app-volume',
//               mountPath: '/app'
//             }
//           ]
//         }
//       ],
//       containers: [
//         {
//           name: 'node-bot',
//           image: 'node:18',
//           workingDir: '/app',
//           command: ['bash', '-c'],
//           args: [
//             'npm install && npm run build && npm run start'
//           ],
//           volumeMounts: [
//             {
//               name: 'app-volume',
//               mountPath: '/app'
//             }
//           ],
//           env: envArray,
//           ports: [
//             {containerPort: 3000}
//           ]
//         }
//       ]
//     }
//   };
// }

export const createServiceSpec = (podName: string, port: number, namespace: string) => {
  return {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: podName,
      namespace: namespace,
      labels: {
        app: podName
      }
    },
    spec: {
      type: 'ClusterIP',
      selector: {
        app: podName
      },
      ports: [
        {port: 80, targetPort: port}
      ]
    }
  };
}

export const createIngressSpec = (serviceName: string, host: string, namespace: string) => {

  return {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name: serviceName,
      namespace: namespace,
      annotations: {
        "kubernetes.io/ingress.class": "nginx"
      }
    },
    spec: {
      rules: [
        {
          host: host,
          "http": {
            "paths": [
              {
                "path": "/",
                "pathType": "Prefix",
                "backend": {
                  "service": {
                    "name": serviceName,
                    "port": {
                      "number": 80
                    }
                  }
                }
              }
            ]
          }
        }
      ]
    }
  };
}

export const createDeploymentSpec = (repoUrl: string, envVars = {}, replicas: number = 1, namespace: string) => {
  const repositoryName = repoUrl.split('/').pop()?.split('.').shift()?.toLowerCase();
  const deploymentName = `${repositoryName}-${Date.now()}`;

  // Convert envVars object to Kubernetes env array format
  const envArray = Object.entries(envVars).map(([key, value]) => ({
    name: key,
    value: String(value)
  }));

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: deploymentName,
      namespace: namespace,
      labels: {
        app: deploymentName
      }
    },
    spec: {
      replicas,
      selector: {
        matchLabels: {
          app: deploymentName
        }
      },
      template: {
        metadata: {
          labels: {
            app: deploymentName
          }
        },
        spec: {
          volumes: [
            {
              name: 'app-volume',
              emptyDir: {}
            }
          ],
          initContainers: [
            {
              name: 'git-clone',
              image: 'alpine/git:latest',
              command: ['sh', '-c'],
              args: [
                `[ -d "/app/.git" ] && (echo "Repository already exists. Pulling latest changes..." && git -C /app pull) || (echo "Repository not found. Cloning..." && git clone ${repoUrl} /app)`
              ],
              volumeMounts: [
                {
                  name: 'app-volume',
                  mountPath: '/app'
                }
              ]
            }
          ],
          containers: [
            {
              name: 'node-bot',
              image: 'node:18',
              workingDir: '/app',
              command: ['bash', '-c'],
              args: [
                'npm install && npm run build && npm run start'
              ],
              volumeMounts: [
                {
                  name: 'app-volume',
                  mountPath: '/app'
                }
              ],
              env: envArray,
              ports: [
                {containerPort: 3000}
              ]
            }
          ]
        }
      }
    }
  };
};


type NamespaceMetadata = {
  repositoryUrl: string;
  deployEnvVars: string;
  deployUser: string;
}

export const createNamespaceSpec = (namespace: string, metadata: NamespaceMetadata) => {
  return {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name: namespace,
      labels: {
        name: namespace,
        openKokopiManaged: 'true',
        ...metadata
      }
    }
  };
};
