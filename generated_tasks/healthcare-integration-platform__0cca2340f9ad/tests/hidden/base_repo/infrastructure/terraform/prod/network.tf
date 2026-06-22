resource "null_resource" "network" {
  triggers = {
    environment = "prod"
    component = "network"
  }
}
