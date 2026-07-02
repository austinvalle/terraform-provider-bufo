package provider

import (
	"context"
	"fmt"

	"github.com/hashicorp/terraform-plugin-framework/attr"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/listplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/objectplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringdefault"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
)

type bufo struct{}

func NewBufo() resource.Resource {
	return &bufo{}
}

func (r *bufo) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = "bufo"
}

func (r *bufo) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = schema.Schema{
		Attributes: map[string]schema.Attribute{
			"name": schema.StringAttribute{
				Description: "Name of the bufo.",
				Required:    true,
			},
		},
		Blocks: map[string]schema.Block{
			"list_block": schema.ListNestedBlock{
				Computed: true,
				PlanModifiers: []planmodifier.List{
					listplanmodifier.UseStateForUnknown(),
				},
				NestedObject: schema.NestedBlockObject{
					Attributes: map[string]schema.Attribute{
						"computed_attr": schema.StringAttribute{
							Computed: true,
							Default:  stringdefault.StaticString("provider is allowed to plan computed_attr"),
						},
						"both_attr": schema.StringAttribute{
							Optional: true,
							Computed: true,
							Default:  stringdefault.StaticString("provider is allowed to plan both_attr"),
						},
					},
				},
			},
			"single_block": schema.SingleNestedBlock{
				Computed: true,
				PlanModifiers: []planmodifier.Object{
					objectplanmodifier.UseStateForUnknown(),
				},
				Attributes: map[string]schema.Attribute{
					"computed_attr": schema.StringAttribute{
						Computed: true,
						Default:  stringdefault.StaticString("provider is allowed to plan computed_attr"),
					},
					"both_attr": schema.StringAttribute{
						Optional: true,
						Computed: true,
						PlanModifiers: []planmodifier.String{
							stringplanmodifier.UseStateForUnknown(),
							stringplanmodifier.RequiresReplace(),
						},
					},
				},
			},
		},
	}
}

type bufoData struct {
	Name        types.String `tfsdk:"name"`
	ListBlock   types.List   `tfsdk:"list_block"`
	SingleBlock types.Object `tfsdk:"single_block"`
}

func bufoBlockObjType() types.ObjectType {
	return types.ObjectType{
		AttrTypes: map[string]attr.Type{
			"computed_attr": types.StringType,
			"both_attr":     types.StringType,
		},
	}
}

func (r *bufo) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var data bufoData

	resp.Diagnostics.Append(req.Plan.Get(ctx, &data)...)
	if resp.Diagnostics.HasError() {
		return
	}

	BufoModifiesYourObject(&data)

	resp.Diagnostics.Append(resp.State.Set(ctx, &data)...)
	if resp.Diagnostics.HasError() {
		return
	}
}

func (r *bufo) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	// don't do anything :P
}

func (r *bufo) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var data bufoData

	resp.Diagnostics.Append(req.Plan.Get(ctx, &data)...)
	if resp.Diagnostics.HasError() {
		return
	}

	BufoModifiesYourObject(&data)

	resp.Diagnostics.Append(resp.State.Set(ctx, &data)...)
	if resp.Diagnostics.HasError() {
		return
	}
}

func (r *bufo) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	// don't do anything :P
}

func BufoModifiesYourObject(data *bufoData) {
	if data.ListBlock.IsUnknown() {
		// The block is computed, so we can set the value if it's marked as unknown
		data.ListBlock = types.ListValueMust(
			bufoBlockObjType(),
			[]attr.Value{
				types.ObjectValueMust(
					bufoBlockObjType().AttributeTypes(),
					map[string]attr.Value{
						"computed_attr": types.StringValue("obj 0 - provider is allowed to set computed_attr"),
						"both_attr":     types.StringValue("obj 0 - provider is allowed to set both_attr"),
					},
				),
				types.ObjectValueMust(
					bufoBlockObjType().AttributeTypes(),
					map[string]attr.Value{
						"computed_attr": types.StringValue("obj 1 - provider is allowed to set computed_attr"),
						"both_attr":     types.StringValue("obj 1 - provider is allowed to set both_attr"),
					},
				),
			},
		)
	} else {
		newListBlock := make([]attr.Value, len(data.ListBlock.Elements()))

		for i, blockElement := range data.ListBlock.Elements() {
			blockAttrs := blockElement.(types.Object).Attributes()

			computedAttr := blockAttrs["computed_attr"]
			if computedAttr.IsUnknown() {
				computedAttr = types.StringValue(fmt.Sprintf("obj %d - provider is allowed to set computed_attr", i))
			}
			bothAttr := blockAttrs["both_attr"]
			if bothAttr.IsUnknown() {
				bothAttr = types.StringValue(fmt.Sprintf("obj %d - provider is allowed to set both_attr", i))
			}

			newListBlock[i] = types.ObjectValueMust(
				bufoBlockObjType().AttrTypes,
				map[string]attr.Value{
					"computed_attr": computedAttr,
					"both_attr":     bothAttr,
				},
			)
		}

		data.ListBlock = types.ListValueMust(bufoBlockObjType(), newListBlock)
	}

	if data.SingleBlock.IsUnknown() {
		// The block is computed, so we can set the value if it's marked as unknown
		data.SingleBlock = types.ObjectValueMust(
			bufoBlockObjType().AttributeTypes(),
			map[string]attr.Value{
				"computed_attr": types.StringValue("obj - provider is allowed to set computed_attr"),
				"both_attr":     types.StringValue("obj - provider is allowed to set both_attr"),
			},
		)
	} else {
		blockAttrs := data.SingleBlock.Attributes()
		computedAttr := blockAttrs["computed_attr"]
		if computedAttr.IsUnknown() {
			computedAttr = types.StringValue("obj - provider is allowed to set computed_attr")
		}
		bothAttr := blockAttrs["both_attr"]
		if bothAttr.IsUnknown() {
			bothAttr = types.StringValue("obj - provider is allowed to set both_attr")
		}
		data.SingleBlock = types.ObjectValueMust(
			bufoBlockObjType().AttrTypes,
			map[string]attr.Value{
				"computed_attr": computedAttr,
				"both_attr":     bothAttr,
			},
		)
	}
}
