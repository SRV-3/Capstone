import { k8sCoreV1Api } from "./config.js";

export async function createService(sandboxId) {
  const serviceManifest = {
    metadata: {
      name: `sandbox-service-${sandboxId}`,
      labels: {
        sandboxId: sandboxId,
      },
    },
    spec: {
      selector: {
        sandboxId: sandboxId,
      },
      ports: [
        {
          name: "http",
          protocol: "TCP",
          port: 80,
          targetPort: 5173,
        },
        {
          name: "agent-http",
          protocol: "TCP",
          port: 3000,
          targetPort: 3000,
        },
      ],
      type: "ClusterIP",
    },
  };

  const response = await k8sCoreV1Api.createNamespacedService({
    namespace: "default",
    body: serviceManifest,
  });

  return response;
}
