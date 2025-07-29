package provider

import (
	"context"
	"fmt"

	"github.com/hashicorp/terraform-plugin-framework/schema/validator"
)

var _ validator.String = validBufoName{}

type validBufoName struct{}

func (validator validBufoName) Description(_ context.Context) string {
	return `value must contain "bufo"`
}

func (validator validBufoName) MarkdownDescription(ctx context.Context) string {
	return validator.Description(ctx)
}

func (v validBufoName) ValidateString(ctx context.Context, req validator.StringRequest, resp *validator.StringResponse) {
	if req.ConfigValue.IsNull() || req.ConfigValue.IsUnknown() {
		return
	}

	bufoFileName := fmt.Sprintf("%s.png", req.ConfigValue.ValueString())
	bufoLocation := fmt.Sprintf("bufos/%s", bufoFileName)

	_, err := bufos.Open(bufoLocation)
	if err != nil {
		resp.Diagnostics.AddAttributeError(
			req.Path,
			"Invalid Bufo Name",
			fmt.Sprintf("No bufo was found for %q, check out the full list at: https://github.com/knobiknows/all-the-bufo/tree/main/all-the-bufo", bufoFileName),
		)
		return
	}
}

func ValidBufoName() validBufoName {
	return validBufoName{}
}
