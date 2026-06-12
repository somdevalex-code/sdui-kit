# Dynamic Forms

This recipe shows a server-driven form with a conditional field.

```json
{
  "componentName": "form",
  "props": {
    "definition": {
      "id": "applicationForm",
      "initialValues": {
        "applicantType": "person",
        "fullName": "",
        "companyName": ""
      },
      "fields": [
        {
          "name": "applicantType",
          "validation": { "required": true }
        },
        {
          "name": "fullName",
          "validation": { "required": "Full name is required" }
        },
        {
          "name": "companyName",
          "visibleWhen": {
            "eq": [{ "var": "form.values.applicantType" }, "company"]
          },
          "validation": { "required": "Company name is required" }
        }
      ],
      "onSubmit": {
        "type": "request",
        "endpoint": "/api/applications",
        "method": "POST",
        "body": { "$from": "form.values" },
        "success": {
          "type": "toast",
          "message": "Application submitted",
          "status": "success"
        }
      }
    },
    "children": [
      {
        "componentName": "selectField",
        "props": {
          "name": "applicantType",
          "label": "Applicant type",
          "options": [
            { "label": "Person", "value": "person" },
            { "label": "Company", "value": "company" }
          ]
        }
      },
      {
        "componentName": "textField",
        "props": {
          "name": "companyName",
          "label": "Company name"
        }
      }
    ]
  }
}
```

The frontend still controls the actual `selectField` and `textField` components. The backend controls field presence, validation rules and submit behavior.
