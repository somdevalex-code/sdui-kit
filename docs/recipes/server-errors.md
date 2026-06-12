# Server Errors

Use server error mapping when the backend validates a submitted form and returns field-level errors.

## Example Error Response

```json
{
  "errors": [
    {
      "path": "email",
      "message": "Email is already used"
    },
    {
      "path": "companyName",
      "message": "Company name is required"
    }
  ]
}
```

## Mapping In The App

```ts
try {
  await form.submit({ actionRunner })
} catch (error) {
  form.mapServerErrors(error.response.errors)
}
```

The form store accepts both array and object shapes:

```ts
form.mapServerErrors({
  email: 'Email is already used',
  companyName: ['Company name is required'],
})
```

Keep transport errors and validation errors separate. Show transport errors with a toast, and map validation errors into fields.
