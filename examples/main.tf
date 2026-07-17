terraform {
  required_providers {
    bufo = {
      source = "austinvalle/bufo"
    }
  }
}

provider "bufo" {}

resource "bufo" "example" {
  name = "Kermit"
}
