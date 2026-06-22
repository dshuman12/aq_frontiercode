resource "null_resource" "observability" {
  triggers = {
    environment = "staging"
    component = "observability"
  }
}
