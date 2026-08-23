# Estimate AWS site cost

This model is for maintainers estimating the static site's AWS bill before a launch or customer
publication. It turns measured traffic assumptions into a repeatable estimate; it is not a price
quote or spending guarantee.

## Use current source prices

Refresh every rate from the official pages before publishing an estimate:

- [Amazon CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)
- [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/)
- [Amazon Route 53 pricing](https://aws.amazon.com/route53/pricing/)
- [AWS Certificate Manager pricing](https://aws.amazon.com/certificate-manager/pricing/)

Rates, free allowances, price classes, regions, taxes, and account discounts change. Record the
retrieval date, AWS region, CloudFront geography or price class, and whether a free tier, credit,
or negotiated discount was excluded. Public ACM certificates used with integrated AWS services
may have a different charge model from private certificates or exported public certificates, so
verify the certificate type on the ACM page.

## Measure the inputs

For each environment, collect:

- `I`: monthly page impressions;
- `B`: average bytes transferred to a viewer per impression, including repeat-visit caching;
- `R`: average CloudFront viewer requests per impression;
- `M`: S3 stored GB-month;
- `P` and `G`: S3 write/list and origin-read request counts;
- `Q`: Route 53 DNS queries;
- `Z`: hosted zones attributable to Stagehand;
- `N`: paid invalidation paths or other optional CloudFront features; and
- the current unit rate for each item in the served geography and AWS region.

Do not equate an impression with one request. Use production measurements or a representative
built page: HTML, fonts, styles, JSON, cache hits, and repeat visits change both `B` and `R`.

## Calculate the estimate

For an impression scenario such as 1,000, 10,000, or 100,000 per month:

```text
viewer GB              = I × B / 1,000,000,000
viewer requests        = I × R
CloudFront subtotal    = viewer GB × transfer rate
                       + viewer requests / request-rate unit × request rate
                       + N × optional-feature rate
S3 subtotal            = M × storage rate
                       + P / write-rate unit × write/list rate
                       + G / read-rate unit × read rate
Route 53 subtotal      = Z × hosted-zone rate
                       + Q / query-rate unit × DNS query rate
certificate subtotal   = certificate quantity × applicable current ACM rate
Monthly estimate = CloudFront subtotal + S3 subtotal + Route 53 subtotal
                 + certificate subtotal + logging/monitoring + taxes
```

Apply current free allowances only after calculating the gross usage, and only when the account
is eligible. At low volume, fixed Route 53 hosted-zone charges and CloudFront/S3 request and
storage charges can matter more than transfer. At higher volume, geography, page weight, request
count, and cache behavior increasingly control the result.

## Publication checklist

Before publishing a customer-facing figure, rerun the calculation with current measured build
size and traffic behavior, open every pricing link above, refresh every unit rate, and have a
second maintainer check units and free-tier assumptions. Present the input table and retrieval
date beside the result so a future reader can reproduce it. Label the result an estimate and give
a range when page weight, cache hit ratio, or traffic geography is uncertain.
