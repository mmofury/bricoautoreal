import { getSessionCustomerAccessToken } from '~/auth';
import { client } from '~/client';
import { graphql } from '~/client/graphql';

const ApplyCheckoutCouponMutation = graphql(`
  mutation ApplyCheckoutCouponMutation($checkoutEntityId: String!, $couponCode: String!) {
    checkout {
      applyCheckoutCoupon(input: { checkoutEntityId: $checkoutEntityId, data: { couponCode: $couponCode } }) {
        checkout {
          entityId
        }
      }
    }
  }
`);

export const applyCoupon = async (cartId: string, couponCode: string) => {
  const customerAccessToken = await getSessionCustomerAccessToken();

  return await client.fetch({
    document: ApplyCheckoutCouponMutation,
    variables: {
      checkoutEntityId: cartId,
      couponCode,
    },
    customerAccessToken,
    fetchOptions: { cache: 'no-store' },
  });
};
