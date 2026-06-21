resource "null_resource" "observability" {
  triggers = {
    environment = "prod"
    component = "observability"
  }
}
