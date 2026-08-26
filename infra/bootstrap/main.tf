resource "aws_s3_bucket" "state" {
  for_each = var.state_bucket_names

  bucket = each.value

  lifecycle {
    prevent_destroy = true
  }

  tags = merge(local.required_tags, { environment = each.key })
}

resource "aws_s3_bucket_ownership_controls" "state" {
  for_each = var.state_bucket_names

  bucket = aws_s3_bucket.state[each.key].id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  for_each = var.state_bucket_names

  bucket                  = aws_s3_bucket.state[each.key].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  for_each = var.state_bucket_names

  bucket = aws_s3_bucket.state[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "state" {
  for_each = var.state_bucket_names

  bucket = aws_s3_bucket.state[each.key].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "state" {
  for_each = var.state_bucket_names

  bucket = aws_s3_bucket.state[each.key].id

  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  depends_on = [aws_s3_bucket_versioning.state]
}

# This AWS account already has a shared GitHub Actions OIDC provider for this
# exact URL, created and owned by an unrelated product (discocase). Rather
# than create a colliding second provider (AWS forbids two providers with the
# same URL in one account) or import the other team's resource into this
# project's state, this project looks the existing provider up read-only and
# reuses its ARN. Verified out-of-band that its client_id_list already
# includes "sts.amazonaws.com", which every trust policy below requires.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}
