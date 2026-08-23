variable "aws_region" {
  description = "AWS region for the OpenTofu state buckets."
  type        = string
  default     = "us-east-2"

  validation {
    condition     = can(regex("^[a-z]{2}(-gov)?-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "aws_region must be a valid AWS region name."
  }
}

variable "state_bucket_names" {
  description = "Globally unique S3 bucket names, one for each Stagehand environment."
  type        = map(string)

  validation {
    condition = (
      length(setsubtract(toset(keys(var.state_bucket_names)), toset(["testpilots", "beta", "stable"]))) == 0 &&
      length(setsubtract(toset(["testpilots", "beta", "stable"]), toset(keys(var.state_bucket_names)))) == 0 &&
      length(distinct(values(var.state_bucket_names))) == 3 &&
      alltrue([
        for name in values(var.state_bucket_names) :
        can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", name)) &&
        !can(regex("\\.\\.", name)) &&
        !can(regex("^[0-9]{1,3}(\\.[0-9]{1,3}){3}$", name)) &&
        alltrue([
          for prefix in ["xn--", "sthree-", "amzn-s3-demo-"] :
          !startswith(name, prefix)
        ]) &&
        alltrue([
          for suffix in ["-s3alias", "--ol-s3", ".mrap", "--x-s3", "--table-s3"] :
          !endswith(name, suffix)
        ])
      ])
    )
    error_message = "state_bucket_names must contain exactly testpilots, beta, and stable with three unique valid S3 bucket names."
  }
}
