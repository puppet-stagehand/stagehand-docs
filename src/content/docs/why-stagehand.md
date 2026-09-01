---
title: Why We Built Stagehand
description: The six problems Stagehand exists to solve, from a fast install to proving Puppet's value to leadership, and why version compatibility mattered enough to build a public register for it.
order: 8
---

Puppet automation solves real problems, but running it well has usually meant weeks of reading before you touch a target, a dashboard that only shows what you already knew to look for, and no good answer when leadership asks what the automation actually bought you. None of that is a Puppet problem specifically. It is what happens when a powerful tool ships without an operating layer on top of it. Stagehand is that layer. Six goals shaped what we built, and why.

## Installed Fast, Not Scheduled

A Puppet install should not require a project plan. We built Stagehand's setup path to get a Puppet Core environment connected and readable in minutes, not days, and without requiring you to read a pile of documentation first to understand what you're about to do. The [Getting Started](/docs/getting-started/) guide is the actual, current version of that path; this page describes the goal driving it, not a substitute for it.

## Something Useful in the First Few Minutes

A tool that only pays off after weeks of configuration loses its champion before it proves itself. Stagehand is built so the first few minutes matter: see which systems have patches waiting, visualize every environment you manage in one place instead of piecing it together from separate SSH sessions, bring an unmanaged brownfield system into view and get an honest read on what it would take to automate it, and check where you stand against a compliance baseline. None of that requires a week of setup first.

## An Action Center, Not a Dashboard

Seeing a problem is not the same as fixing it. A dashboard that only observes still leaves the remediation work to a separate tool, a separate login, and a separate mental model. Stagehand is built to close that gap: surface what's wrong, help you build a remediation plan around it, and run that plan from the same place you found the problem, using Puppet Bolt's own task and plan execution model rather than a second, unnamed automation surface.

## A Record You Can Show Leadership

Puppet teams get asked to justify their existence in budget seasons whether they're ready to or not. An automation platform that can't produce a record of what it did, when, and against what baseline leaves that argument to memory and screenshots. Stagehand is built to keep an audit trail your security team can rely on, and to give you the receipts to show what the automation, and the team running it, actually delivered.

## A Path Forward, Not Just a Task Runner

Running Puppet well is a skill that develops over time, and most tools treat every operator as equally experienced on day one. Stagehand is built to guide you along that path instead: to help a team get better at running infrastructure as code, not just execute the same tasks faster. What "better" looks like changes as your team matures, and the product should change with it.

## Every Puppet You Actually Run, Not Just the Newest One

Real environments rarely run one version of one product. A fleet built up over years typically mixes Open Source Puppet, community OpenVox builds, and one or more of Puppet Core, Puppet Enterprise, and Puppet Enterprise Advanced, often at different versions across different teams. We built the [Compatibility Register](/compatibility/) because a feature that only works on the newest release is a feature most fleets can't use yet. Every entry there is evidence-verified against a real version, not assumed to work because it should.

## What This Means Today

This page describes what's driving Stagehand's design, not a claim that every goal above is fully realized yet. For what's actually live right now, start with [Getting Started](/docs/getting-started/), confirm your exact environment in the [Compatibility Register](/compatibility/), and read [Security and Trust Boundaries](/docs/security/) before connecting anything to it.
