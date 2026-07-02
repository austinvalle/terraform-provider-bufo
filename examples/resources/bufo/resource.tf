terraform {
  required_providers {
    bufo = {
      source = "austinvalle/bufo"
    }
  }
}

resource "bufo" "test1" {
  name = "bufo-the-builder"
  list_block { both_attr = "set by config!" }
  list_block {} # Provider will set both_attr
}

resource "bufo" "test2" {
  name = "bufo-the-builder"
  single_block {
    both_attr = "set by config!"
  }
}
