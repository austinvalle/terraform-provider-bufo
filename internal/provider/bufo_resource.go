package provider

import (
	"context"

	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
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
	}
}

func (r *bufo) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {

}

func (r *bufo) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {

}

func (r *bufo) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {

}

func (r *bufo) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {

}
