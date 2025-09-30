list "bufo_bufos" "test" {
  provider = bufo

  include_resource = true

  config {
    directory = "bufos"
  }
}