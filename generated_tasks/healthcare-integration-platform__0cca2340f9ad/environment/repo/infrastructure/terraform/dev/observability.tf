resource "null_resource" "observability" {
  triggers = {
    environment = "dev"
    component = "observability"
  }
}
