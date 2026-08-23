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
        can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", name))
      ])
    )
    error_message = "state_bucket_names must contain exactly testpilots, beta, and stable with three unique valid S3 bucket names."
  }
}
