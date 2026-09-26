'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios').default;

const {
  classifyClubkonnectTransaction,
  clubkonnectMobileNumber,
  parseClubkonnectBundles,
  queryClubkonnectTransaction,
  removeClubkonnectCredentials,
  safeClubkonnectError,
  setClubkonnectCredentials,
  submitClubkonnectData,
} = require('../dist/services/clubkonnect.service');

test('ClubKonnect catalogue preserves exact string plan IDs', () => {
  const bundles = parseClubkonnectBundles({
    MOBILE_NETWORK: {
      MTN: [
        {
          ID: '01',
          PRODUCT: [
            {
              PRODUCT_CODE: '4',
              PRODUCT_ID: '1000',
              PRODUCT_NAME: '1 GB - Weekly',
              PRODUCT_AMOUNT: '410',
            },
            {
              PRODUCT_CODE: '10',
              PRODUCT_ID: '1000.00',
              PRODUCT_NAME: '1 GB - Monthly',
              PRODUCT_AMOUNT: '563.125',
            },
          ],
        },
      ],
    },
  });

  assert.deepEqual(
    bundles.map((bundle) => bundle.planId),
    ['1000', '1000.00'],
  );
  assert.equal(bundles[0].networkId, '01');
  assert.equal(bundles[1].costKobo, 56313);
});

test('ClubKonnect status 200 is delivered, while retry-window states stay pending', () => {
  assert.equal(
    classifyClubkonnectTransaction({
      statusCode: 200,
      status: 'ORDER_COMPLETED',
      remark: 'Success',
    }).state,
    'delivered',
  );

  for (const [statusCode, status, remark] of [
    [100, 'ORDER_RECEIVED', 'Awaiting Processing'],
    [201, 'ORDER_COMPLETED', 'Network Unresponsive'],
    [299, 'ORDER_COMPLETED', 'Unspecified Error'],
    [300, 'ORDER_PROCESSING', 'Awaiting Network Response'],
    [412, 'ORDER_ERROR', 'INSUFFICIENT_APIAMOUNT'],
    [600, 'ORDER_ONHOLD', 'Network Error'],
    [699, 'ORDER_ONHOLD', 'Unspecified Error'],
    [799, 'ORDER_PROCESSED', 'Unspecified Error'],
  ]) {
    assert.equal(
      classifyClubkonnectTransaction({ statusCode, status, remark }).state,
      'pending',
      `status ${statusCode} must remain pending`,
    );
  }
});

test('ClubKonnect terminal cancellation, refund and request errors are failed', () => {
  for (const [statusCode, status] of [
    [400, 'ORDER_ERROR'],
    [417, 'ORDER_ERROR'],
    [500, 'ORDER_CANCELLED'],
    [509, 'ORDER_CANCELLED'],
    [899, 'ORDER_REFUNDED'],
  ]) {
    assert.equal(
      classifyClubkonnectTransaction({ statusCode, status }).state,
      'failed',
      `status ${statusCode} must be terminal`,
    );
  }
});

test('ClubKonnect diagnostics strip GET query credentials', () => {
  const sanitized = safeClubkonnectError({
    isAxiosError: true,
    message:
      'GET https://www.nellobytesystems.com/APIQueryV1.asp?UserID=CK123&APIKey=super-secret&RequestID=req-1 failed',
  }).message;

  assert.doesNotMatch(sanitized, /CK123|super-secret/);
  assert.match(sanitized, /redacted/);
});

test('ClubKonnect mock submission preserves plan ID and requery prefers provider order ID', async () => {
  const originalGet = axios.get;
  const requests = [];
  setClubkonnectCredentials('CK999999', 'a'.repeat(32));
  axios.get = async (url, config) => {
    requests.push({ url, params: config.params });
    return {
      data: JSON.stringify({
        orderId: 'ORDER-123',
        statusCode: 100,
        status: 'ORDER_RECEIVED',
        remark: 'Awaiting Processing',
      }),
    };
  };

  try {
    const submitted = await submitClubkonnectData({
      networkId: '01',
      planId: '1000.00',
      phone: '+2348031234567',
      requestId: 'VENOM-UNIQUE-1',
    });
    assert.equal(submitted.state, 'pending');
    assert.equal(requests[0].params.DataPlan, '1000.00');
    assert.equal(requests[0].params.MobileNumber, '08031234567');
    assert.equal(clubkonnectMobileNumber('08031234567'), '08031234567');
    assert.equal(requests[0].params.RequestID, 'VENOM-UNIQUE-1');

    await queryClubkonnectTransaction({
      requestId: 'VENOM-UNIQUE-1',
      orderId: 'ORDER-123',
    });
    assert.equal(requests[1].params.OrderID, 'ORDER-123');
    assert.equal('RequestID' in requests[1].params, false);
  } finally {
    axios.get = originalGet;
    removeClubkonnectCredentials();
  }
});
