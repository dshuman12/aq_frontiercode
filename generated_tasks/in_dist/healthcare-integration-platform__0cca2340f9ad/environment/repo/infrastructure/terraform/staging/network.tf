resource "null_resource" "network" {
  triggers = {
    environment = "staging"
    component = "network"
  }
}
