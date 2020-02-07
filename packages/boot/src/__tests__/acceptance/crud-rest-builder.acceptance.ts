// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/boot
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {ApplicationConfig} from '@loopback/core';
import {juggler, RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {CrudRestComponent} from '@loopback/rest-crud';
import {expect, givenHttpServerConfig, TestSandbox} from '@loopback/testlab';
import {resolve} from 'path';
import {BootMixin, ModelApiBooter} from '../..';

describe('CRUD rest builder acceptance tests', () => {
  let app: BooterApp;
  const SANDBOX_PATH = resolve(__dirname, '../../.sandbox');
  const sandbox = new TestSandbox(SANDBOX_PATH);

  beforeEach('reset sandbox', () => sandbox.reset());
  beforeEach(givenAppWithDataSource);

  afterEach(stopApp);

  it('binds the controller and repository to the application', async () => {
    await sandbox.copyFile(
      resolve(__dirname, '../fixtures/product.model.js'),
      'models/product.model.js',
    );

    await sandbox.writeTextFile(
      'model-endpoints/product.rest-config.js',
      `
const {Product} = require('../models/product.model');
module.exports = {
  model: Product,
  pattern: 'CrudRest',
  dataSource: 'db',
  basePath: '/products',
};
      `,
    );

    // Boot & start the application
    await app.boot();
    await app.start();

    expect(app.getBinding('repositories.ProductRepository').key).to.eql(
      'repositories.ProductRepository',
    );

    expect(app.getBinding('controllers.ProductController').key).to.eql(
      'controllers.ProductController',
    );
  });

  it('throws if there is no base path in the config', async () => {
    await sandbox.copyFile(
      resolve(__dirname, '../fixtures/product.model.js'),
      'models/product.model.js',
    );

    await sandbox.writeTextFile(
      'model-endpoints/product.rest-config.js',
      `
const {Product} = require('../models/product.model');
module.exports = {
  model: Product,
  pattern: 'CrudRest',
  dataSource: 'db',
};
      `,
    );

    // Boot the application
    await expect(app.boot()).to.be.rejectedWith(
      /Missing required field "basePath" in configuration for model Product./,
    );
  });

  it('throws if a Model is used instead of an Entity', async () => {
    await sandbox.copyFile(
      resolve(__dirname, '../fixtures/no-entity.model.js'),
      'models/no-entity.model.js',
    );

    await sandbox.writeTextFile(
      'model-endpoints/no-entity.rest-config.js',
      `
const {NoEntity} = require('../models/no-entity.model');
module.exports = {
  model: NoEntity,
  pattern: 'CrudRest',
  dataSource: 'db',
  basePath: '/no-entities',
};
      `,
    );

    // Boot the application
    await expect(app.boot()).to.be.rejectedWith(
      /CrudRestController requires an Entity, Models are not supported/,
    );
  });

  class BooterApp extends BootMixin(RepositoryMixin(RestApplication)) {
    constructor(options?: ApplicationConfig) {
      super(options);
      this.projectRoot = sandbox.path;
      this.booters(ModelApiBooter);
      this.component(CrudRestComponent);
    }
  }

  async function givenAppWithDataSource() {
    app = new BooterApp({
      rest: givenHttpServerConfig(),
    });
    app.dataSource(new juggler.DataSource({connector: 'memory'}), 'db');
  }

  async function stopApp() {
    try {
      await app.stop();
    } catch (err) {
      // application is booting
    }
  }
});