import { loadHoldedEnvConfig } from './holded-env.mjs';

const runStamp = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, '')
  .slice(0, 14);
const expectedMissingStatuses = [400, 404];

const envConfig = loadHoldedEnvConfig(process.cwd());
const apiKey = envConfig.apiKey;
const baseUrl = envConfig.baseUrl;

if (!apiKey) {
  console.error(
    'Missing HOLDED_TEST_API_KEY or HOLDED_API_KEY. Checked process.env and apps/holded/.env.local.'
  );
  process.exit(1);
}

const results = [];

async function main() {
  console.log(`Holded smoke run ${runStamp}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`API key source: ${envConfig.source}`);

  const runtime = {
    treasurySeed: await getFirstItem('/api/invoicing/v1/treasury'),
  };

  await runReadChecks();
  await runCrudTests(runtime);

  const passed = results.filter((entry) => entry.ok).length;
  const failed = results.length - passed;

  console.log('');
  console.log(`Summary: ${passed} passed, ${failed} failed, ${results.length} total checks.`);

  if (failed > 0) {
    console.log('');
    console.log('Failures:');
    for (const entry of results.filter((item) => !item.ok)) {
      console.log(`- ${entry.module}.${entry.operation}: ${entry.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('All documented smoke checks passed.');
}

async function runReadChecks() {
  await runContinuing('invoices.list', () =>
    checkListOnly('invoices.list', '/api/invoicing/v1/documents/invoice', { limit: 5, page: 1 })
  );
  await runContinuing('documents.list_estimate', () =>
    checkListOnly('documents.list_estimate', '/api/invoicing/v1/documents/estimate', {
      limit: 5,
      page: 1,
    })
  );
  await runContinuing('contacts.list', () =>
    checkListOnly('contacts.list', '/api/invoicing/v1/contacts', { limit: 5, page: 1 })
  );
  await runContinuing('products.list', () =>
    checkListOnly('products.list', '/api/invoicing/v1/products', { limit: 5, page: 1 })
  );
  await runContinuing('services.list', () =>
    checkListOnly('services.list', '/api/invoicing/v1/services', { limit: 5, page: 1 })
  );
  await runContinuing('expensesaccounts.list', () =>
    checkListOnly('expensesaccounts.list', '/api/invoicing/v1/expensesaccounts', {
      limit: 5,
      page: 1,
    })
  );
  await runContinuing('saleschannels.list', () =>
    checkListOnly('saleschannels.list', '/api/invoicing/v1/saleschannels', { limit: 5, page: 1 })
  );
  await runContinuing('warehouses.list', () =>
    checkListOnly('warehouses.list', '/api/invoicing/v1/warehouses', { limit: 5, page: 1 })
  );
  await runContinuing('contactgroups.list', () =>
    checkListOnly('contactgroups.list', '/api/invoicing/v1/contacts/groups', { limit: 5, page: 1 })
  );
  await runContinuing('treasury.list', () =>
    checkListOnly('treasury.list', '/api/invoicing/v1/treasury')
  );
  await runContinuing('payments.list', () =>
    checkListOnly('payments.list', '/api/invoicing/v1/payments', { limit: 5, page: 1 })
  );
  await runContinuing('paymentmethods.list', () =>
    checkListOnly('paymentmethods.list', '/api/invoicing/v1/paymentmethods')
  );
  await runContinuing('remittances.list', () =>
    checkListOnly('remittances.list', '/api/invoicing/v1/remittances')
  );
  await runContinuing('taxes.get', () => checkListOnly('taxes.get', '/api/invoicing/v1/taxes'));
  await runContinuing('numberingseries.get_estimate', () => checkNumberingSeriesGet('estimate'));
  await runContinuing('numberingseries.get_invoice', () => checkNumberingSeriesGet('invoice'));
  await runContinuing('remittances.get', () =>
    checkOptionalGetFromList('remittances.get', '/api/invoicing/v1/remittances', (item) => {
      const remittanceId = pickId(item);
      return remittanceId ? `/api/invoicing/v1/remittances/${remittanceId}` : null;
    })
  );
}

async function runCrudTests(runtime) {
  await runContinuing('contacts', () =>
    runEntityCrud({
      module: 'contacts',
      listPath: '/api/invoicing/v1/contacts',
      listQuery: { limit: 10, page: 1 },
      createPath: '/api/invoicing/v1/contacts',
      buildGetPath: (id) => `/api/invoicing/v1/contacts/${id}`,
      buildUpdatePath: (id) => `/api/invoicing/v1/contacts/${id}`,
      buildDeletePath: (id) => `/api/invoicing/v1/contacts/${id}`,
      createBody: () => ({
        name: `VF Smoke Contact ${runStamp}`,
        code: `VF-SMOKE-${runStamp}`,
        email: `holded-smoke-${runStamp}@example.test`,
        phone: '600000001',
        type: 'client',
        note: 'Temporary smoke test contact',
      }),
      updateBody: () => ({
        name: `VF Smoke Contact ${runStamp} Updated`,
        phone: '600000009',
        note: 'Updated by smoke test',
      }),
    })
  );

  await runContinuing('products', () =>
    runEntityCrud({
      module: 'products',
      listPath: '/api/invoicing/v1/products',
      listQuery: { limit: 10, page: 1 },
      createPath: '/api/invoicing/v1/products',
      buildGetPath: (id) => `/api/invoicing/v1/products/${id}`,
      buildUpdatePath: (id) => `/api/invoicing/v1/products/${id}`,
      buildDeletePath: (id) => `/api/invoicing/v1/products/${id}`,
      createBody: () => ({
        kind: 'simple',
        name: `VF Smoke Product ${runStamp}`,
        desc: 'Temporary smoke test product',
        price: 11.25,
        tax: 21,
        sku: `VF-P-${runStamp}`,
        barcode: `84${runStamp.slice(-10)}`,
      }),
      updateBody: () => ({
        name: `VF Smoke Product ${runStamp} Updated`,
        desc: 'Updated smoke test product',
        tax: 10,
        subtotal: 13.5,
      }),
    })
  );

  await runContinuing('services', () =>
    runEntityCrud({
      module: 'services',
      listPath: '/api/invoicing/v1/services',
      listQuery: { limit: 10, page: 1 },
      createPath: '/api/invoicing/v1/services',
      buildGetPath: (id) => `/api/invoicing/v1/services/${id}`,
      buildUpdatePath: (id) => `/api/invoicing/v1/services/${id}`,
      buildDeletePath: (id) => `/api/invoicing/v1/services/${id}`,
      createBody: () => ({
        name: `VF Smoke Service ${runStamp}`,
        desc: 'Temporary smoke test service',
        tax: 21,
        subtotal: 19,
        cost: 7,
      }),
      updateBody: () => ({
        name: `VF Smoke Service ${runStamp} Updated`,
        desc: 'Updated smoke test service',
        tax: 10,
        subtotal: 21,
        cost: 8,
      }),
    })
  );

  await runContinuing('expensesaccounts', () =>
    runEntityCrud({
      module: 'expensesaccounts',
      listPath: '/api/invoicing/v1/expensesaccounts',
      listQuery: { limit: 10, page: 1 },
      loadAllItemsForCreate: true,
      createPath: '/api/invoicing/v1/expensesaccounts',
      buildGetPath: (id) => `/api/invoicing/v1/expensesaccounts/${id}`,
      buildUpdatePath: (id) => `/api/invoicing/v1/expensesaccounts/${id}`,
      buildDeletePath: (id) => `/api/invoicing/v1/expensesaccounts/${id}`,
      createBody: (items) => ({
        name: `VF Smoke Expense ${runStamp}`,
        desc: 'Temporary smoke test expense account',
        accountNum: findNextAccountNumber(items, 629000),
      }),
      createRetryLimit: 25,
      shouldRetryCreate: (response) =>
        response.status === 409 && response.message.toLowerCase().includes('accountnum'),
      adjustCreateBody: (body) => ({
        ...body,
        accountNum: Number(body.accountNum) + 1,
      }),
      updateBody: () => ({
        name: `VF Smoke Expense ${runStamp} Updated`,
        desc: 'Updated smoke test expense account',
      }),
      postDeleteExpectedStatuses: [200],
      postDeleteIsSuccess: (response) => Number(response.data?.archived) === 1,
    })
  );

  await runContinuing('saleschannels', () =>
    runEntityCrud({
      module: 'saleschannels',
      listPath: '/api/invoicing/v1/saleschannels',
      listQuery: { limit: 10, page: 1 },
      loadAllItemsForCreate: true,
      createPath: '/api/invoicing/v1/saleschannels',
      buildGetPath: (id) => `/api/invoicing/v1/saleschannels/${id}`,
      buildUpdatePath: (id) => `/api/invoicing/v1/saleschannels/${id}`,
      buildDeletePath: (id) => `/api/invoicing/v1/saleschannels/${id}`,
      createBody: (items) => ({
        name: `VF Smoke Channel ${runStamp}`,
        desc: 'Temporary smoke test sales channel',
        accountNum: findNextAccountNumber(items, 700000),
      }),
      createRetryLimit: 25,
      shouldRetryCreate: (response) =>
        response.status === 409 && response.message.toLowerCase().includes('account number'),
      adjustCreateBody: (body) => ({
        ...body,
        accountNum: Number(body.accountNum) + 1,
      }),
      updateBody: () => ({
        name: `VF Smoke Channel ${runStamp} Updated`,
        desc: 'Updated smoke test sales channel',
      }),
      postDeleteExpectedStatuses: [200],
      postDeleteIsSuccess: (response) => Number(response.data?.archived) === 1,
    })
  );

  await runContinuing('warehouses', () =>
    runEntityCrud({
      module: 'warehouses',
      listPath: '/api/invoicing/v1/warehouses',
      listQuery: { limit: 10, page: 1 },
      createPath: '/api/invoicing/v1/warehouses',
      buildGetPath: (id) => `/api/invoicing/v1/warehouses/${id}`,
      buildUpdatePath: (id) => `/api/invoicing/v1/warehouses/${id}`,
      buildDeletePath: (id) => `/api/invoicing/v1/warehouses/${id}`,
      createBody: () => ({
        name: `VF Smoke Warehouse ${runStamp}`,
        email: `warehouse-${runStamp}@example.test`,
        phone: '600000002',
        address: `Smoke Street ${runStamp}`,
        default: false,
      }),
      updateBody: () => ({
        name: `VF Smoke Warehouse ${runStamp} Updated`,
        phone: '600000003',
        mobile: '600000004',
        address: `Updated Smoke Street ${runStamp}`,
        default: false,
      }),
      updateExpectedStatuses: [200, 201],
    })
  );

  await runContinuing('contactgroups', () =>
    runEntityCrud({
      module: 'contactgroups',
      listPath: '/api/invoicing/v1/contacts/groups',
      listQuery: { limit: 10, page: 1 },
      createPath: '/api/invoicing/v1/contacts/groups',
      buildGetPath: (id) => `/api/invoicing/v1/contacts/groups/${id}`,
      buildUpdatePath: (id) => `/api/invoicing/v1/contacts/groups/${id}`,
      buildDeletePath: (id) => `/api/invoicing/v1/contacts/groups/${id}`,
      createBody: () => ({
        name: `VF Smoke Group ${runStamp}`,
        desc: 'Temporary smoke test group',
        color: '#2F855A',
      }),
      updateBody: () => ({
        name: `VF Smoke Group ${runStamp} Updated`,
        desc: 'Updated smoke test group',
        color: '#C05621',
      }),
    })
  );

  await runContinuing('documents', () => runDocumentCrud());
  await runContinuing('numberingseries', () => runNumberingSeriesCrud());
  await runContinuing('treasury', () => runTreasuryCrud(runtime));
  await runContinuing('payments', () => runPaymentCrud(runtime));
}

async function runDocumentCrud() {
  const docType = 'estimate';
  const tempContactName = `VF Smoke Estimate Contact ${runStamp}`;
  let contactId = null;
  let documentId = null;

  try {
    const contactCreate = await checkedRequest(
      'documents.contact_create',
      'POST',
      '/api/invoicing/v1/contacts',
      {
        body: {
          name: tempContactName,
          code: `VF-EST-${runStamp}`,
          email: `estimate-${runStamp}@example.test`,
          type: 'client',
        },
        expectedStatuses: [201],
      }
    );
    contactId = pickId(contactCreate.data);
    ensureId(contactId, 'documents.contact_create');

    await checkedRequest('documents.list', 'GET', `/api/invoicing/v1/documents/${docType}`, {
      query: { limit: 10, page: 1 },
      expectedStatuses: [200],
    });

    const createResult = await checkedRequest(
      'documents.create',
      'POST',
      `/api/invoicing/v1/documents/${docType}`,
      {
        body: {
          contactId,
          date: unixNow(),
          subject: `VF Smoke Estimate ${runStamp}`,
          notes: 'Temporary smoke test estimate',
          lines: [
            {
              desc: 'Smoke test line',
              units: 1,
              price: 17,
              tax: 21,
            },
          ],
        },
        expectedStatuses: [200, 201],
      }
    );
    documentId = pickId(createResult.data);
    ensureId(documentId, 'documents.create');

    await checkedRequest(
      'documents.get',
      'GET',
      `/api/invoicing/v1/documents/${docType}/${documentId}`,
      {
        expectedStatuses: [200],
      }
    );

    await checkedRequest(
      'documents.update',
      'PUT',
      `/api/invoicing/v1/documents/${docType}/${documentId}`,
      {
        body: {
          notes: 'Updated smoke test estimate',
          lines: [
            {
              desc: 'Updated smoke test line',
              units: 2,
              price: 9,
              tax: 10,
            },
          ],
        },
        expectedStatuses: [200],
      }
    );

    await checkedRequest(
      'documents.get_after_update',
      'GET',
      `/api/invoicing/v1/documents/${docType}/${documentId}`,
      {
        expectedStatuses: [200],
      }
    );
  } finally {
    if (documentId) {
      await checkedRequest(
        'documents.delete',
        'DELETE',
        `/api/invoicing/v1/documents/${docType}/${documentId}`,
        {
          expectedStatuses: [200, 204],
          allowFailure: true,
        }
      );
      await checkedRequest(
        'documents.get_after_delete',
        'GET',
        `/api/invoicing/v1/documents/${docType}/${documentId}`,
        {
          expectedStatuses: expectedMissingStatuses,
        }
      );
    }

    if (contactId) {
      await checkedRequest(
        'documents.contact_delete',
        'DELETE',
        `/api/invoicing/v1/contacts/${contactId}`,
        {
          expectedStatuses: [200, 204],
          allowFailure: true,
        }
      );
      await checkedRequest(
        'documents.contact_get_after_delete',
        'GET',
        `/api/invoicing/v1/contacts/${contactId}`,
        {
          expectedStatuses: expectedMissingStatuses,
        }
      );
    }
  }
}

async function runNumberingSeriesCrud() {
  const type = 'estimate';
  const createName = `VF Smoke Series ${runStamp}`;
  const updateName = `VF Smoke Series ${runStamp} Updated`;
  let numberingSeriesId = null;

  const getSeriesList = async (label) => {
    const result = await checkedRequest(label, 'GET', `/api/invoicing/v1/numberingseries/${type}`, {
      expectedStatuses: [200],
    });
    return toArray(result.data);
  };

  const beforeSeries = await getSeriesList('numberingseries.get_before');
  const beforeIds = new Set(beforeSeries.map((item) => pickId(item)).filter(Boolean));

  try {
    await checkedRequest(
      'numberingseries.create',
      'POST',
      `/api/invoicing/v1/numberingseries/${type}`,
      {
        body: {
          name: createName,
          format: `VF[YY]%%%%`,
          last: '0',
          type,
        },
        expectedStatuses: [201],
      }
    );

    const afterCreateSeries = await getSeriesList('numberingseries.get_after_create');
    const createdSeries =
      afterCreateSeries.find((item) => getString(item, 'name') === createName) ||
      afterCreateSeries.find((item) => {
        const id = pickId(item);
        return id && !beforeIds.has(id);
      });

    numberingSeriesId = createdSeries ? pickId(createdSeries) : null;
    ensureId(numberingSeriesId, 'numberingseries.create');
    recordResult('numberingseries.locate_created', true, 200, `id=${numberingSeriesId}`);

    await checkedRequest(
      'numberingseries.update',
      'PUT',
      `/api/invoicing/v1/numberingseries/${type}/${numberingSeriesId}`,
      {
        body: {
          name: updateName,
          format: `VFU[YY]%%%%`,
          last: '1',
        },
        expectedStatuses: [200],
      }
    );

    const afterUpdateSeries = await getSeriesList('numberingseries.get_after_update');
    const updatedSeries = afterUpdateSeries.find((item) => pickId(item) === numberingSeriesId);
    const updatedOk = getString(updatedSeries, 'name') === updateName;
    recordResult(
      'numberingseries.verify_updated',
      updatedOk,
      200,
      updatedOk ? `id=${numberingSeriesId}` : 'updated series not found with the expected name'
    );

    if (!updatedOk) {
      throw new Error('numberingseries.verify_updated failed');
    }
  } finally {
    if (numberingSeriesId) {
      await checkedRequest(
        'numberingseries.delete',
        'DELETE',
        `/api/invoicing/v1/numberingseries/${type}/${numberingSeriesId}`,
        {
          expectedStatuses: [200, 204],
          allowFailure: true,
        }
      );

      const afterDeleteSeries = await getSeriesList('numberingseries.get_after_delete_list');
      const stillExists = afterDeleteSeries.some((item) => pickId(item) === numberingSeriesId);
      recordResult(
        'numberingseries.get_after_delete',
        !stillExists,
        200,
        stillExists
          ? `series ${numberingSeriesId} still present in type list`
          : `id=${numberingSeriesId}`
      );

      if (stillExists) {
        throw new Error(
          `numberingseries.get_after_delete failed: ${numberingSeriesId} still present`
        );
      }
    }
  }
}

async function runTreasuryCrud(runtime) {
  const treasuryType = normalizeTreasuryType(runtime.treasurySeed?.type) || 'bank';
  let treasuryId = null;

  try {
    const createResult = await checkedRequest(
      'treasury.create',
      'POST',
      '/api/invoicing/v1/treasury',
      {
        body: {
          name: `VF Smoke Treasury ${runStamp}`,
          type: treasuryType,
          balance: 0,
          bank: 'Smoke Bank',
          bankname: 'Smoke Bank',
        },
        expectedStatuses: [201],
      }
    );
    treasuryId = pickId(createResult.data);
    ensureId(treasuryId, 'treasury.create');

    await checkedRequest('treasury.get', 'GET', `/api/invoicing/v1/treasury/${treasuryId}`, {
      expectedStatuses: [200],
    });

    await checkedRequest('treasury.update', 'PUT', `/api/invoicing/v1/treasury/${treasuryId}`, {
      body: {
        name: `VF Smoke Treasury ${runStamp} Updated`,
        type: treasuryType,
        balance: 15,
        bank: 'Smoke Bank Updated',
        bankname: 'Smoke Bank Updated',
      },
      expectedStatuses: [200],
      allowFailure: true,
    });

    await checkedRequest(
      'treasury.get_after_update',
      'GET',
      `/api/invoicing/v1/treasury/${treasuryId}`,
      {
        expectedStatuses: [200],
      }
    );
  } finally {
    if (treasuryId) {
      const deleteResult = await checkedRequest(
        'treasury.delete',
        'DELETE',
        `/api/invoicing/v1/treasury/${treasuryId}`,
        {
          expectedStatuses: [200, 204, 405],
        }
      );

      if (deleteResult.status === 405) {
        recordResult(
          'treasury.get_after_delete',
          true,
          405,
          'skipped because Holded does not allow deleting treasury accounts'
        );
      } else {
        await checkedRequest(
          'treasury.get_after_delete',
          'GET',
          `/api/invoicing/v1/treasury/${treasuryId}`,
          {
            expectedStatuses: expectedMissingStatuses,
          }
        );
      }
    }
  }
}

async function runPaymentCrud(runtime) {
  let contactId = null;
  let treasuryId = null;
  let paymentId = null;
  const treasuryType = normalizeTreasuryType(runtime.treasurySeed?.type) || 'bank';

  try {
    const contactCreate = await checkedRequest(
      'payments.contact_create',
      'POST',
      '/api/invoicing/v1/contacts',
      {
        body: {
          name: `VF Smoke Payment Contact ${runStamp}`,
          code: `VF-PAY-${runStamp}`,
          email: `payment-${runStamp}@example.test`,
          type: 'client',
        },
        expectedStatuses: [201],
      }
    );
    contactId = pickId(contactCreate.data);
    ensureId(contactId, 'payments.contact_create');

    const treasuryCreate = await checkedRequest(
      'payments.treasury_create',
      'POST',
      '/api/invoicing/v1/treasury',
      {
        body: {
          name: `VF Smoke Payment Treasury ${runStamp}`,
          type: treasuryType,
          balance: 0,
          bank: 'Smoke Payments Bank',
          bankname: 'Smoke Payments Bank',
        },
        expectedStatuses: [201],
      }
    );
    treasuryId = pickId(treasuryCreate.data);
    ensureId(treasuryId, 'payments.treasury_create');

    const createResult = await checkedRequest(
      'payments.create',
      'POST',
      '/api/invoicing/v1/payments',
      {
        body: {
          bankId: treasuryId,
          contactId,
          amount: 19,
          desc: `VF Smoke Payment ${runStamp}`,
          date: unixNow(),
        },
        expectedStatuses: [201],
      }
    );
    paymentId = pickId(createResult.data);
    ensureId(paymentId, 'payments.create');

    await checkedRequest('payments.get', 'GET', `/api/invoicing/v1/payments/${paymentId}`, {
      expectedStatuses: [200],
    });

    await checkedRequest('payments.update', 'PUT', `/api/invoicing/v1/payments/${paymentId}`, {
      body: {
        bankId: treasuryId,
        contactId,
        amount: 21,
        desc: `VF Smoke Payment ${runStamp} Updated`,
        date: unixNow(),
      },
      expectedStatuses: [200],
    });

    await checkedRequest(
      'payments.get_after_update',
      'GET',
      `/api/invoicing/v1/payments/${paymentId}`,
      {
        expectedStatuses: [200],
      }
    );
  } finally {
    if (paymentId) {
      await checkedRequest('payments.delete', 'DELETE', `/api/invoicing/v1/payments/${paymentId}`, {
        expectedStatuses: [200, 204],
        allowFailure: true,
      });
      await checkedRequest(
        'payments.get_after_delete',
        'GET',
        `/api/invoicing/v1/payments/${paymentId}`,
        {
          expectedStatuses: expectedMissingStatuses,
        }
      );
    }

    if (treasuryId) {
      const deleteResult = await checkedRequest(
        'payments.treasury_delete',
        'DELETE',
        `/api/invoicing/v1/treasury/${treasuryId}`,
        {
          expectedStatuses: [200, 204, 405],
        }
      );

      if (deleteResult.status === 405) {
        recordResult(
          'payments.treasury_get_after_delete',
          true,
          405,
          'skipped because Holded does not allow deleting treasury accounts'
        );
      } else {
        await checkedRequest(
          'payments.treasury_get_after_delete',
          'GET',
          `/api/invoicing/v1/treasury/${treasuryId}`,
          {
            expectedStatuses: expectedMissingStatuses,
          }
        );
      }
    }

    if (contactId) {
      await checkedRequest(
        'payments.contact_delete',
        'DELETE',
        `/api/invoicing/v1/contacts/${contactId}`,
        {
          expectedStatuses: [200, 204],
          allowFailure: true,
        }
      );
      await checkedRequest(
        'payments.contact_get_after_delete',
        'GET',
        `/api/invoicing/v1/contacts/${contactId}`,
        {
          expectedStatuses: expectedMissingStatuses,
        }
      );
    }
  }
}

async function runEntityCrud(config) {
  let resourceId = null;

  try {
    const listResult = await checkedRequest(`${config.module}.list`, 'GET', config.listPath, {
      query: config.listQuery,
      expectedStatuses: [200],
    });
    const listItems = toArray(listResult.data);
    const createItems = config.loadAllItemsForCreate
      ? await listAllItems(config.listPath, config.listQuery)
      : listItems;

    const createResult = await createEntity(config, createItems);
    resourceId = pickId(createResult.data);
    ensureId(resourceId, `${config.module}.create`);

    await checkedRequest(`${config.module}.get`, 'GET', config.buildGetPath(resourceId), {
      expectedStatuses: [200],
    });

    await checkedRequest(`${config.module}.update`, 'PUT', config.buildUpdatePath(resourceId), {
      body: config.updateBody(),
      expectedStatuses: config.updateExpectedStatuses || [200],
    });

    await checkedRequest(
      `${config.module}.get_after_update`,
      'GET',
      config.buildGetPath(resourceId),
      {
        expectedStatuses: [200],
      }
    );
  } finally {
    if (resourceId) {
      await checkedRequest(
        `${config.module}.delete`,
        'DELETE',
        config.buildDeletePath(resourceId),
        {
          expectedStatuses: [200, 204],
          allowFailure: true,
        }
      );

      const postDeleteResult = await rawRequest('GET', config.buildGetPath(resourceId), {
        expectedStatuses: config.postDeleteExpectedStatuses || expectedMissingStatuses,
      });
      const postDeleteOk = config.postDeleteIsSuccess
        ? config.postDeleteIsSuccess(postDeleteResult)
        : postDeleteResult.ok;

      recordResult(
        `${config.module}.get_after_delete`,
        postDeleteOk,
        postDeleteResult.status,
        postDeleteOk ? summarizePayload(postDeleteResult.data) : postDeleteResult.message
      );

      if (!postDeleteOk) {
        throw new Error(`${config.module}.get_after_delete failed: ${postDeleteResult.message}`);
      }
    }
  }
}

async function createEntity(config, createItems) {
  const maxAttempts = config.createRetryLimit || 1;
  let body = config.createBody(createItems);
  let lastResponse = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await rawRequest('POST', config.createPath, {
      body,
      expectedStatuses: [201],
    });

    if (response.ok) {
      const suffix = attempt > 1 ? ` after ${attempt} attempts` : '';
      recordResult(
        `${config.module}.create`,
        true,
        response.status,
        `${summarizePayload(response.data)}${suffix}`
      );
      return response;
    }

    lastResponse = response;

    if (
      !config.shouldRetryCreate ||
      !config.adjustCreateBody ||
      !config.shouldRetryCreate(response, body, attempt) ||
      attempt === maxAttempts
    ) {
      recordResult(`${config.module}.create`, false, response.status, response.message);
      throw new Error(`${config.module}.create failed: ${response.message}`);
    }

    body = config.adjustCreateBody(body, response, attempt);
  }

  recordResult(
    `${config.module}.create`,
    false,
    lastResponse?.status ?? 0,
    lastResponse?.message ?? 'create failed without response'
  );
  throw new Error(`${config.module}.create failed`);
}

async function checkListOnly(name, pathName, query) {
  await checkedRequest(name, 'GET', pathName, {
    query,
    expectedStatuses: [200],
  });
}

async function checkNumberingSeriesGet(type) {
  await checkedRequest(
    `numberingseries.get_${type}`,
    'GET',
    `/api/invoicing/v1/numberingseries/${type}`,
    {
      expectedStatuses: [200],
    }
  );
}

async function checkOptionalGetFromList(name, listPath, buildPathFromItem) {
  const listResult = await rawRequest('GET', listPath, { expectedStatuses: [200] });
  const items = toArray(listResult.data);
  if (items.length === 0) {
    recordResult(name, true, listResult.status, 'skipped because the list is empty');
    return;
  }

  const pathName = buildPathFromItem(items[0]);
  if (!pathName) {
    recordResult(name, true, listResult.status, 'skipped because the first row has no id');
    return;
  }

  await checkedRequest(name, 'GET', pathName, {
    expectedStatuses: [200],
  });
}

async function getFirstItem(pathName, query) {
  const response = await rawRequest('GET', pathName, {
    query,
    expectedStatuses: [200],
    allowFailure: true,
  });
  return toArray(response.data)[0] || null;
}

async function listAllItems(pathName, baseQuery = {}, limit = 100) {
  const items = [];

  for (let page = 1; page <= 100; page += 1) {
    const response = await rawRequest('GET', pathName, {
      query: {
        ...baseQuery,
        limit,
        page,
      },
      expectedStatuses: [200],
    });

    if (!response.ok) {
      throw new Error(`Failed to list ${pathName} page ${page}: ${response.message}`);
    }

    const pageItems = toArray(response.data);
    items.push(...pageItems);

    if (pageItems.length < limit) {
      break;
    }
  }

  return items;
}

async function checkedRequest(name, method, pathName, options = {}) {
  const response = await rawRequest(method, pathName, options);
  const ok = response.ok || options.allowFailure;
  recordResult(name, ok, response.status, ok ? summarizePayload(response.data) : response.message);

  if (!response.ok && !options.allowFailure) {
    throw new Error(`${name} failed: ${response.message}`);
  }

  return response;
}

async function rawRequest(method, pathName, options = {}) {
  const url = new URL(pathName, baseUrl);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      key: apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const data = text ? safeJson(text) : null;
  const expectedStatuses = options.expectedStatuses || [200];
  const ok = expectedStatuses.includes(response.status);
  const message = ok ? summarizePayload(data) : buildErrorMessage(response.status, data, text);

  return {
    ok,
    status: response.status,
    data,
    text,
    message,
  };
}

async function runContinuing(label, callback) {
  const before = results.length;

  try {
    await callback();
  } catch (error) {
    const hasFailure = results.slice(before).some((entry) => !entry.ok);
    if (!hasFailure) {
      recordResult(
        `${label}.unexpected`,
        false,
        0,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

function pickId(payload) {
  if (!payload) return null;
  if (typeof payload === 'string' || typeof payload === 'number') {
    const normalized = String(payload).trim();
    return isPlaceholderId(normalized) ? null : normalized;
  }

  const directCandidates = [
    payload.id,
    payload._id,
    payload.contactId,
    payload.productId,
    payload.serviceId,
    payload.paymentId,
    payload.treasuryId,
    payload.documentId,
    payload.groupId,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      const normalized = String(candidate).trim();
      if (!isPlaceholderId(normalized)) {
        return normalized;
      }
    }
  }

  if (payload.data && payload.data !== payload) {
    const nestedId = pickId(payload.data);
    if (nestedId) return nestedId;
  }

  return null;
}

function isPlaceholderId(value) {
  return !value || value.includes('$') || value.startsWith('(string)');
}

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.data,
    payload.items,
    payload.results,
    payload.rows,
    payload.docs,
    payload.documents,
    payload.contacts,
    payload.products,
    payload.services,
    payload.values,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function getString(record, key) {
  if (!record || typeof record !== 'object') return null;
  return typeof record[key] === 'string' ? record[key] : null;
}

function normalizeTreasuryType(value) {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

function findNextAccountNumber(items, minimum) {
  const numbers = items
    .map((item) => Number(item?.accountNum))
    .filter((value) => Number.isInteger(value) && value >= minimum);

  if (numbers.length === 0) {
    return minimum;
  }

  return Math.max(...numbers) + 1;
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function ensureId(id, context) {
  if (!id) {
    throw new Error(`${context} did not return an id`);
  }
}

function summarizePayload(payload) {
  if (payload === null || payload === undefined) return 'no body';
  if (Array.isArray(payload)) return `array(${payload.length})`;
  if (typeof payload === 'string') return payload.slice(0, 160);
  if (typeof payload !== 'object') return String(payload);

  const id = pickId(payload);
  if (id) return `id=${id}`;

  const size = toArray(payload).length;
  if (size > 0) return `items=${size}`;

  const keys = Object.keys(payload).slice(0, 6);
  return keys.length > 0 ? `keys=${keys.join(',')}` : 'empty object';
}

function buildErrorMessage(status, data, text) {
  const objectMessage =
    data && typeof data === 'object'
      ? data.error || data.message || data.msg || data.statusText || null
      : null;
  const fallback =
    typeof text === 'string' && text.trim() ? text.trim().slice(0, 200) : `HTTP ${status}`;
  return `${status} ${objectMessage || fallback}`;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function recordResult(name, ok, status, message) {
  const [module, ...rest] = name.split('.');
  const operation = rest.join('.') || 'check';
  const line = `${ok ? 'PASS' : 'FAIL'} ${name} [${status}] ${message}`;
  console.log(line);
  results.push({ module, operation, ok, status, message });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
