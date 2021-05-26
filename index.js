const core = require('@actions/core')
const exec = require('@actions/exec')
const { HttpClient } = require('@actions/http-client')
const path = require('path')
const fs = require('fs')

// catch failed exec
process.on('unhandledRejection', err => {
  core.setFailed(err.message);
});

const setup = async () => {
  const domain = core.getInput('domain');

  // aws cli should be ready to use
  await exec.exec('aws --version');
  // get current runner IP address
  const http = new HttpClient('github-action', undefined, { allowRetries: true, maxRetries: 10 });
  const ipv4 = await http.getJson('https://api.ipify.org?format=json');
  const ipv6 = await http.getJson('https://api64.ipify.org?format=json');
  core.info(`ipv4: ${ipv4.result.ip}`);
  core.info(`ipv6: ${ipv6.result.ip}`);
  // get existing access policy via aws es cli
  const filepathTmp = path.join(process.env['RUNNER_TEMP'], "aes_config.json")
  core.debug(filepathTmp)
  await exec.exec(`/bin/bash -c "aws es describe-elasticsearch-domain-config --domain-name ${domain} --output json &> ${filepathTmp}"`)
  let accessPolicy = JSON.parse(require(filepathTmp)['DomainConfig']['AccessPolicies']['Options'])
  // append current runner IP to the accesss policy
  accessPolicy['Statement'].forEach((st, i) => {
    if (st['Condition'] && st['Condition']['IpAddress'] && st['Condition']['IpAddress']['aws:SourceIp']) {
      accessPolicy['Statement'][i]['Condition']['IpAddress']['aws:SourceIp'].push(ipv4.result.ip)
    }
  })
  const filepathAPTmp = path.join(process.env['RUNNER_TEMP'], "aes_ap.json")
  fs.writeFileSync(filepathAPTmp, JSON.stringify(accessPolicy))
  core.debug(filepathAPTmp)
  core.debug(JSON.stringify(require(filepathAPTmp)))
  // update access policy
  await exec.exec(`/bin/bash -c "aws es update-elasticsearch-domain-config --domain-name ${domain} --access-policies file://${filepathAPTmp}"`)
  await exec.exec(`sleep 10`) // give AES some time to apply the new policy
};

const run = async () => {
  try {
    await setup();
  } catch (error) {
    core.setFailed(error.message);
  } finally {
    console.log("action completed");
  }
};

run();