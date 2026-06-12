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

Use `$expr` when a field should be computed by an expression.
