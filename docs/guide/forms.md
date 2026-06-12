# Forms

Forms are headless and live in `@sdui-kit/forms`.

```bash
pnpm add @sdui-kit/forms
```

Define form state through a JSON-compatible definition:

```json
{
  "id": "applicationForm",
  "initialValues": {
    "applicantType": "person"
  },
  "fields": [
    {
      "name": "applicantType",
      "validation": { "required": true }
    },
    {
      "name": "companyName",
      "visibleWhen": {
        "eq": [{ "var": "form.values.applicantType" }, "company"]
      },
      "validation": {
        "required": "Company name is required"
      }
    }
  ],
  "onSubmit": {
    "type": "request",
    "endpoint": "/api/applications",
    "method": "POST",
    "body": { "$from": "form.values" }
  }
}
```

The form store exposes:

- `values`
- `errors`
- `touched`
- `isSubmitting`
- `isValid`
- `submitCount`

Field state supports `visibleWhen`, `disabledWhen` and `requiredWhen` expressions.
