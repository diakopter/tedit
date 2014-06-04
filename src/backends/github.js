"use strict";

var modes = require('js-git/lib/modes');

exports.menuItem =  {
  icon: "github",
  label: "Mount Github Repo",
  action: addGithubMount
};

exports.createRepo = function (config) {
  if (!config.github) return;
  var repo = {};
  if (!config.url) throw new Error("Missing url in github config");
  var githubName = getGithubName(config.url);
  var prefs = require('prefs');
  var githubToken = prefs.get("githubToken", "");
  if (!githubToken) throw new Error("Missing github access token");
  require('js-github/mixins/github-db')(repo, githubName, githubToken);

  if (config.passphrase) {
    repo = require('./encrypt-repo')(repo, config.passphrase);
  }

  // Cache github objects locally in indexeddb
  if (window.indexedDB) {
    require('js-git/mixins/add-cache')(repo, require('js-git/mixins/indexed-db'));
  }
  else {
    require('js-git/mixins/add-cache')(repo, require('js-git/mixins/websql-db'));
  }

  require('./repo-common')(repo);

  return repo;
};

function getGithubName(url) {
  var match = url.match(/github.com[:\/](.*?)(?:\.git)?$/);
  if (!match) throw new Error("Url is not github repo: " + url);
  return match[1];
}

function addGithubMount(row) {
  var prefs = require('prefs');
  var githubToken = prefs.get("githubToken", "");
  var dialog = require('ui/dialog');

  dialog.multiEntry("Mount Github Repo", [
    {name: "path", placeholder: "user/name", required:true},
    {name: "ref", placeholder: "refs/heads/master"},
    {name: "name", placeholder: "localname"},
    {name: "passphrase", placeholder: "encryption passphrase"},
    {name: "token", placeholder: "Enter github auth token", required:true, value: githubToken}
  ], function (result) {
    if (!result) return;
    if (result.token !== githubToken) {
      prefs.set("githubToken", result.token);
    }
    var url = result.path;
    // Assume github if user/name combo is given
    if (/^[^\/:@]+\/[^\/:@]+$/.test(url)) {
      url = "git@github.com:" + url + ".git";
    }
    var fs = require('data/fs');
    var name = result.name || result.path.match(/[^\/]*$/)[0];
    var ref = result.ref || "refs/heads/master";
    var config = {
      url: url,
      ref: ref,
      github: true
    };
    if (result.passphrase) config.passphrase = result.passphrase;
    require('ui/tree').makeUnique(row, name, modes.commit, function (path) {
      row.call(path, fs.addRepo, config);
    });
  });
}
