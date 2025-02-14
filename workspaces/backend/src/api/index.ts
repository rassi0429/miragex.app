import express from "express";
import {parseEnvVars} from "../lib/utils.js";
import {KubeConfig, CoreV1Api, NetworkingV1Api, AppsV1Api} from '@kubernetes/client-node';
import {
  createServiceSpec,
  createIngressSpec,
  createNamespaceSpec,
  createDeploymentSpec
} from '../lib/k8s/index.js';


const router = express.Router();


// Kubernetes API クライアントの初期化
const kc = new KubeConfig();
// (1) ローカル開発で~/.kube/configを使う場合
kc.loadFromDefault()

const k8sApps = kc.makeApiClient(AppsV1Api);
const k8sCore = kc.makeApiClient(CoreV1Api);
const k8sNetApi = kc.makeApiClient(NetworkingV1Api);

// "/api"

router.get("/", (req, res) => {
  res.send("Hello from API");
});

router.post("/deploy", async (req, res) => {
  const {namespace} = req.body;
  const {repoUrl} = req.body;
  const {envVars} = req.body;
  const {host} = req.body;

  const parsedEnv = parseEnvVars(envVars || '');

  try {
    const k8sNamespace = createNamespaceSpec(namespace, {
      // https://github.com/hogehoge/hagehage => hogehoge_hagehage
      repositoryUrl: repoUrl.replace(/https?:\/\//, '').replace(/\//g, '_'),
      deployEnvVars: envVars,
      deployUser: "admin"
    })
    await k8sCore.createNamespace({body: k8sNamespace})

    // Pod用マニフェストを作成
    const deployManifest = createDeploymentSpec(repoUrl, parsedEnv, 1, namespace);
    const serviceManifest = createServiceSpec(deployManifest.metadata.name, 3000, namespace);
    const ingressManifest = createIngressSpec(deployManifest.metadata.name, host, namespace)


    const deployment = await k8sApps.createNamespacedDeployment({namespace: namespace, body: deployManifest});
    const serviceResponse = await k8sCore.createNamespacedService({namespace: namespace, body: serviceManifest});
    const ingressResponse = await k8sNetApi.createNamespacedIngress({namespace: namespace, body: ingressManifest})
    const createdPodName = deployment.metadata?.name;
    res.json({
      message: `Deployment ${createdPodName} created successfully`,
      podName: createdPodName,
    })
  } catch (error) {
    console.error('Error creating Pod:', error);
    const errorMessage = (error as Error).message;
    res.status(500).json({error: errorMessage});
  }
})


router.get('/namespaces', async (req, res) => {
  try {
    const namespacesResponse = await k8sCore.listNamespace({labelSelector: 'openKokopiManaged=true'});
    res.json(namespacesResponse.items)
  } catch (error) {
    console.error('Error listing pods:', error);
    const errorMessage = (error as Error).message;
    res.status(500).json({error: errorMessage});
  }
});

router.get("/namespace/:namespace/pods", async (req, res) => {
  const namespace = req.params.namespace;
  try {
    const podsResponse = await k8sCore.listNamespacedPod({namespace: namespace});
    res.json(podsResponse.items);
  } catch (error) {
    console.error('Error listing pods:', error);
    const errorMessage = (error as Error).message;
    res.status(500).json({error: errorMessage});
  }
})

router.get("/namespace/:namespace/pod/:podname" , async (req, res) => {
  const namespace = req.params.namespace;
  const podName = req.params.podname;
  try {
    const podResponse = await k8sCore.readNamespacedPod({namespace: namespace, name: podName});
    res.json(podResponse);
  } catch (error) {
    console.error('Error fetching pod:', error);
    const errorMessage = (error as Error).message;
    res.status(500).json({error: errorMessage});
  }
})

router.get("/namespace/:namespace/pod/:podname/log", async (req, res) => {
  const namespace = req.params.namespace;
  const podName = req.params.podname;
  try {
    const logsResponse = await k8sCore.readNamespacedPodLog({namespace: namespace, name: podName});
    res.json({log: logsResponse});
  } catch (error) {
    console.error('Error fetching logs:', error);
    const errorMessage = (error as Error).message;
    res.status(500).json({error: errorMessage});
  }
})

router.get("/namespace/:namespace/services", async (req, res) => {
  const namespace = req.params.namespace;
  try {
    const servicesResponse = await k8sCore.listNamespacedService({namespace: namespace});
    res.json(servicesResponse.items);
  } catch (error) {
    console.error('Error listing services:', error);
    const errorMessage = (error as Error).message;
    res.status(500).json({error: errorMessage});
  }
})

router.get("/namespace/:namespace/ingresses", async (req, res) => {
  const namespace = req.params.namespace;
  try {
    const ingressesResponse = await k8sNetApi.listNamespacedIngress({namespace: namespace});
    res.json(ingressesResponse.items);
  } catch (error) {
    console.error('Error listing ingresses:', error);
    const errorMessage = (error as Error).message;
    res.status(500).json({error: errorMessage});
  }
})

router.post("/namespace/:namespace/delete", async (req, res) => {
  const namespace = req.params.namespace;
  try {
    await k8sCore.deleteNamespace({name: namespace});
    res.json({message: `Namespace ${namespace} deleted successfully`});
  } catch (error) {
    console.error('Error deleting namespace:', error);
    const errorMessage = (error as Error).message;
    res.status(500).json({error: errorMessage});
  }
})

// router.get('/pods/:name/logs', async (req, res) => {
//   const podName = req.params.name;
//   try {
//     // initContainerは完了後に終了するので、ログを見たいのはメインコンテナ "node-bot" の想定
//     const logsResponse = await k8sCore.readNamespacedPodLog({
//       namespace: 'default',
//       name: podName,
//       container: 'node-bot'
//     });
//     res.json({log: logsResponse});
//   } catch (error) {
//     console.error('Error fetching logs:', error);
//     const errorMessage = (error as Error).message;
//     res.status(500).json({error: errorMessage});
//   }
// });
//
// router.get('/pods/:name/delete', async (req, res) => {
//   const podName = req.params.name;
//   try {
//     await k8sCore.deleteNamespacedPod({namespace: 'default', name: podName});
//     await k8sCore.deleteNamespacedService({namespace: "default", name: podName})
//     await k8sNetApi.deleteNamespacedIngress({namespace: "default", name: podName})
//     res.json({message: `Pod ${podName} deleted successfully`});
//   } catch (error) {
//     console.error('Error deleting pod:', error);
//     const errorMessage = (error as Error).message;
//     res.status(500).json({error: errorMessage});
//   }
// });

export default router;
