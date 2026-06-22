resource "null_resource" "database" {
  triggers = {
    environment = "staging"
    component = "database"
  }
}
