"""Custom exception handler for consistent API error responses."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "success": False,
            "status_code": response.status_code,
            "errors": [],
        }

        if isinstance(response.data, dict):
            for field, messages in response.data.items():
                if field == "detail":
                    error_data["message"] = str(messages)
                else:
                    if isinstance(messages, list):
                        for message in messages:
                            error_data["errors"].append({"field": field, "message": str(message)})
                    else:
                        error_data["errors"].append({"field": field, "message": str(messages)})
        elif isinstance(response.data, list):
            error_data["errors"] = response.data

        if not error_data.get("message") and error_data["errors"]:
            error_data["message"] = "Validation error"
        elif not error_data.get("message"):
            error_data["message"] = "An error occurred"

        response.data = error_data

    return response


class ServiceException(Exception):
    """Base exception for service-layer errors."""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.status_code = status_code
        super().__init__(message)
