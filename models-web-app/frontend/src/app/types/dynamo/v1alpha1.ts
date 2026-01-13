export interface DynamoGraphDeployment {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
  };
  spec: {
    services: {
      [key: string]: {
        dynamoNamespace: string;
        componentType: string;
        replicas: number;
        envFromSecret?: string;
        resources?: {
          limits?: {
            gpu?: string;
          };
        };
        extraPodSpec: {
          mainContainer: {
            image: string;
            workingDir?: string;
            command?: string[];
            args?: string[];
          };
        };
        envs?: {
          name: string;
          value: string;
        }[];
      };
    };
  };
}
