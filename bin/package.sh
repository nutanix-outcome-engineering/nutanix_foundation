#!/bin/bash

PROJECT_ROOT=$(git rev-parse --show-toplevel)

tar -C ${PROJECT_ROOT} -czf nutanix_foundation.tar.gz index.js package.json readme.md
tar -C ${PROJECT_ROOT} -czf dependencies.tar.gz node_modules
