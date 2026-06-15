# Expressions

Expressions are safe JSON conditions. They are used by forms, actions, and dynamic props. They do not use `eval`.

## Variables

Read values from runtime context:

```json
{ "var": "form.values.applicantType" }
```

Use `fallback` when a value may be missing:

```json
{ "var": "user.role", "fallback": "guest" }
```

## Conditions

```json
{
  "and": [
    { "eq": [{ "var": "form.values.type" }, "company"] },
    { "notEmpty": { "var": "form.values.companyName" } }
  ]
}
```

Supported operators:

- `eq`, `neq`
- `gt`, `gte`, `lt`, `lte`
- `and`, `or`, `not`
- `includes`
- `empty`, `notEmpty`

Use the same condition shape anywhere an expression is accepted. For example, an action can be skipped unless the current form state is valid:

```json
{
  "type": "request",
  "when": {
    "and": [
      { "eq": [{ "var": "form.isValid" }, true] },
      { "not": { "var": "form.isSubmitting" } }
    ]
  },
  "endpoint": "/api/applications/draft",
  "method": "PATCH",
  "body": { "$from": "form.values" }
}
```

Form fields use expression fields such as `visibleWhen`, `disabledWhen`, and `requiredWhen`:

```json
{
  "name": "companyName",
  "visibleWhen": {
    "eq": [{ "var": "form.values.applicantType" }, "company"]
  },
  "requiredWhen": {
    "eq": [{ "var": "form.values.applicantType" }, "company"]
  }
}
```

## Value Resolution

Use `$from` to copy values into request bodies:

```json
{
  "type": "request",
  "endpoint": "/api/applications",
  "body": {
    "application": { "$from": "form.values" }
  }
}
```

Use `$expr` when a field should be computed by an expression:

```json
{
  "type": "request",
  "endpoint": "/api/applications",
  "method": "POST",
  "body": {
    "application": { "$from": "form.values" },
    "requiresManualReview": {
      "$expr": {
        "or": [
          { "gte": [{ "var": "form.values.amount" }, 10000] },
          { "eq": [{ "var": "form.values.applicantType" }, "company"] }
        ]
      }
    }
  }
}
```

`$from` and `$expr` are value-resolution markers. They are resolved in places such as request `body`, `payload`, `params`, `headers`, and `invalidate` before the adapter receives the request.
