---
# This is a fake document just used for testing registry documentation. This provider doesn't have a list resource
page_title: "bufo ListResource - bufo"
subcategory: ""
description: |-
  Lists bufos found at: https://github.com/austinvalle/terraform-provider-bufo/tree/main/internal/provider/bufos
---

# bufo (ListResource)

Lists bufos found at: https://github.com/austinvalle/terraform-provider-bufo/tree/main/internal/provider/bufos

## Example Usage

```terraform
terraform {
  required_providers {
    bufo = {
      source = "austinvalle/bufo"
    }
  }
}

list "bufo" "all" {
  config {
    prefix = "bufo-offers-"
  }
}
```

## Schema

### Optional

- `prefix` (String) Only return bufos that start with this prefix
