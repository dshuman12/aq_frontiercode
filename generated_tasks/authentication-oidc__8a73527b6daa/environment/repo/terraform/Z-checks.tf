# ***** DO NOT REMOVE UNLESS YOU ABSOLUTELY KNOW WHAT YOU'RE DOING ***** #

resource "null_resource" "checks" {
  depends_on = [
    module.v3,
    module.v4,
    module.v5
  ]
}