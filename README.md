# Setup IP-based Access to Amazon ElasticSearch

## Prerequisites

- AWS CLI must be available and logged in via `aws-actions/configure-aws-credentials`.

## Get Started

```yml
- name: Setup IP-based Access to AES
  uses: zachguo/setup-aes-ip-access@v1
  with:
    domain: your-domain # name of your AES domain
```

## License
MIT