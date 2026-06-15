# Forms

Forms are headless and live in `@sdui-kit/forms`.

::: code-group

```bash [npm]
npm install @sdui-kit/forms
```

```bash [pnpm]
pnpm add @sdui-kit/forms
```

```bash [yarn]
yarn add @sdui-kit/forms
```

```bash [bun]
bun add @sdui-kit/forms
```

:::

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
    "body": { "$from": "form.values" },
    "success": {
      "type": "toast",
      "message": "Application submitted",
      "status": "success"
    },
    "error": {
      "type": "toast",
      "message": "Application could not be submitted",
      "status": "error"
    }
  }
}
```

When a form submits through `FormStore.submit({ actionRunner })`, the store validates fields, then runs `onSubmit` with current form state in runtime context. That is why the action can copy form values into the request body with `{ "$from": "form.values" }`.

For a complete submit flow, combine request, invalidation, screen refresh, and success/error UI:

```json
{
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
      "requiredWhen": {
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
    "body": {
      "application": { "$from": "form.values" }
    },
    "invalidate": ["ApplicationList"],
    "success": {
      "type": "sequence",
      "actions": [
        {
          "type": "toast",
          "message": "Application submitted",
          "status": "success"
        },
        {
          "type": "refreshScreen"
        }
      ]
    },
    "error": {
      "type": "toast",
      "message": "Fix the highlighted fields and try again",
      "status": "error"
    }
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

See [Action Flows](../recipes/actions.md) for more mutation examples.
