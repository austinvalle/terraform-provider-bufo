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
    # Choose the name of a bufo:
    # https://github.com/austinvalle/terraform-provider-bufo/tree/main/internal/provider/bufos
    #
    # If name is omitted, a random bufo will be used.
    name = "bufo-the-builder"
  }
}
