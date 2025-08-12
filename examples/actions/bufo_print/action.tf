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
    # random colorized bufo
    color = true
  }
}
