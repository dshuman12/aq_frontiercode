resource "null_resource" "network" {
  triggers = {
    environment = "dev"
    component = "network"
  }
}
