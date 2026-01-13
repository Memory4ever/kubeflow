"""Route handlers for DELETE requests."""

from kubeflow.kubeflow.crud_backend import api, logging
from werkzeug.exceptions import NotFound

from .. import versions
from . import bp

log = logging.getLogger(__name__)


@bp.route(
    "/api/namespaces/<namespace>/inferenceservices/<inference_service>",
    methods=["DELETE"],
)
def delete_inference_service(inference_service, namespace):
    """Handle DELETE requests and delete the provided InferenceService or DynamoGraphDeployment."""
    log.info("Deleting Resource %s/%s'", namespace, inference_service)

    # Try deleting as InferenceService
    gvk_kserve = versions.inference_service_gvk()
    try:
        api.delete_custom_rsrc(**gvk_kserve, name=inference_service, namespace=namespace)
        return api.success_response(
            "message",
            "InferenceService %s/%s successfully deleted." % (namespace, inference_service),
        )
    except Exception:
        # If failed, try deleting as DynamoGraphDeployment
        log.info("Failed to delete as InferenceService, trying as DynamoGraphDeployment")
        pass

    # Try deleting as DynamoGraphDeployment
    gvk_dynamo = versions.dynamo_graph_deployment_gvk()
    try:
        api.delete_custom_rsrc(**gvk_dynamo, name=inference_service, namespace=namespace)
        return api.success_response(
            "message",
            "DynamoGraphDeployment %s/%s successfully deleted." % (namespace, inference_service),
        )
    except Exception as e:
        log.error("Failed to delete resource %s/%s: %s", namespace, inference_service, e)
        return api.failed_response(
            "message",
            "Failed to delete resource %s/%s" % (namespace, inference_service)
        ), 500
