resource "aws_cloudfront_key_value_store" "tester_gate" {
  name    = "stagehand-${var.environment}-tester-gate"
  comment = "Shared-password gate for testing guides (AUTH-01/02/03) — key value managed out-of-band, never in Terraform state"
  tags    = local.required_tags
}
