import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  NamespaceService,
  SnackBarConfig,
  SnackBarService,
  SnackType,
} from 'kubeflow';
import { load, YAMLException } from 'js-yaml';
import { InferenceServiceK8s } from 'src/app/types/kfserving/v1beta1';
import { MWABackendService } from 'src/app/services/backend.service';

const KSERVE_TEMPLATE = `apiVersion: "serving.kserve.io/v1beta1"
kind: "InferenceService"
metadata:
  name: "sklearn-iris"
spec:
  predictor:
    model:
      modelFormat:
        name: sklearn
      storageUri: "gs://kfserving-examples/models/sklearn/1.0/model"`;

const DYNAMO_TEMPLATE = `apiVersion: nvidia.com/v1alpha1
kind: DynamoGraphDeployment
metadata:
  name: vllm-v1-disagg-router
spec:
  services:
    Frontend:
      dynamoNamespace: vllm-v1-disagg-router
      componentType: frontend
      replicas: 1
      extraPodSpec:
        mainContainer:
          image: nvcr.io/nvidia/ai-dynamo/vllm-runtime:my-tag
      envs:
        - name: DYN_ROUTER_MODE
          value: kv
    VllmDecodeWorker:
      dynamoNamespace: vllm-v1-disagg-router
      envFromSecret: hf-token-secret
      componentType: worker
      replicas: 2
      resources:
        limits:
          gpu: "1"
      extraPodSpec:
        mainContainer:
          image: nvcr.io/nvidia/ai-dynamo/vllm-runtime:my-tag
          workingDir: /workspace/examples/backends/vllm
          command:
          - python3
          - -m
          - dynamo.vllm
          args:
            - --model
            - Qwen/Qwen3-0.6B
            - --is-decode-worker
    VllmPrefillWorker:
      dynamoNamespace: vllm-v1-disagg-router
      envFromSecret: hf-token-secret
      componentType: worker
      replicas: 2
      resources:
        limits:
          gpu: "1"
      extraPodSpec:
        mainContainer:
          image: nvcr.io/nvidia/ai-dynamo/vllm-runtime:my-tag
          workingDir: /workspace/examples/backends/vllm
          command:
          - python3
          - -m
          - dynamo.vllm
          args:
            - --model
            - Qwen/Qwen3-0.6B
            - --is-prefill-worker`;

@Component({
  selector: 'app-submit-form',
  templateUrl: './submit-form.component.html',
  styleUrls: ['./submit-form.component.scss'],
})
export class SubmitFormComponent implements OnInit {
  yaml = '';
  namespace: string;
  applying = false;
  selectedPlatform = 'kserve';

  constructor(
    private router: Router,
    private ns: NamespaceService,
    private snack: SnackBarService,
    private backend: MWABackendService,
  ) {}

  ngOnInit() {
    this.ns.getSelectedNamespace().subscribe(ns => {
      this.namespace = ns;
    });
    this.yaml = KSERVE_TEMPLATE;
  }

  navigateBack() {
    this.router.navigate(['']);
  }

  onPlatformChange(platform: string) {
    this.selectedPlatform = platform;
    if (platform === 'dynamo') {
      this.yaml = DYNAMO_TEMPLATE;
    } else {
      this.yaml = KSERVE_TEMPLATE;
    }
  }

  submit() {
    this.applying = true;

    let cr: InferenceServiceK8s = {};
    try {
      cr = load(this.yaml);
    } catch (e) {
      let msg = 'Could not parse the provided YAML';

      if (e.mark && e.mark.line) {
        msg = 'Error parsing the provided YAML in line: ' + e.mark.line;
      }
      const config: SnackBarConfig = {
        data: {
          msg,
          snackType: SnackType.Error,
        },
        duration: 16000,
      };
      this.snack.open(config);
      this.applying = false;
      return;
    }

    if (!cr.metadata) {
      const config: SnackBarConfig = {
        data: {
          msg: 'InferenceService must have a metadata field.',
          snackType: SnackType.Error,
        },
        duration: 8000,
      };
      this.snack.open(config);

      this.applying = false;
      return;
    }

    cr.metadata.namespace = this.namespace;
    console.log(cr);

    this.backend.postInferenceService(cr).subscribe({
      next: () => {
        this.navigateBack();
      },
      error: () => {
        this.applying = false;
      },
    });
  }
}
