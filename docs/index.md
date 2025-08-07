---
page_title: "Provider: Bufo"
description: |-
  The bufo provider generates ASCII bufos in the console
---

# Bufo Provider

-> **Note:** Use at least Terraform [`v1.14.0-alpha20250806`](https://github.com/hashicorp/terraform/releases/tag/v1.14.0-alpha20250806) for running action examples.

The bufo provider has an action that can be used to print out a bufo image as ASCII art.
You can print a specific bufo by using one of the file names (minus the extension) in this repo: https://github.com/austinvalle/terraform-provider-bufo/tree/main/internal/provider/bufos.

```terraform
terraform {
  required_providers {
    bufo = {
      source = "austinvalle/bufo"
    }
  }
}

resource "terraform_data" "test" {
  lifecycle {
    action_trigger {
      events  = [after_create]
      actions = [action.bufo_print.success]
    }
  }
}

action "bufo_print" "success" {
  config {
    name = "bufo-the-builder"
  }
}
```

If no `name` is provided, a random bufo will be printed.

```terraform
action "bufo_print" "success" {
  config {} # random bufo
}
```

 You can set `color` to `true`, if your terminal supports it, for a colorized bufo.

```terraform
action "bufo_print" "success" {
  config { color = true } # random colorized bufo
}
```
