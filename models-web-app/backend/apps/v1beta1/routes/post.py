"""POST routes of the backend."""

from flask import request

from kubeflow.kubeflow.crud_backend import api, decorators, logging

from ...common import versions
from . import bp

log = logging.getLogger(__name__)


@bp.route("/api/namespaces/<namespace>/inferenceservices", methods=["POST"])
@decorators.request_is_json_type
@decorators.required_body_params("apiVersion", "kind", "metadata", "spec")
def post_inference_service(namespace):
    """Handle creation of an InferenceService or DynamoGraphDeployment."""
    cr = request.get_json()
    kind = cr.get("kind")

    if kind == "DynamoGraphDeployment":
        gvk = versions.dynamo_graph_deployment_gvk()
        message = "DynamoGraphDeployment successfully created."
    else:
        gvk = versions.inference_service_gvk()
        message = "InferenceService successfully created."

    api.create_custom_rsrc(**gvk, data=cr, namespace=namespace)

    return api.success_response("message", message)
