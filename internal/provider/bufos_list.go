package provider

import (
	"context"
	"slices"
	"strings"

	"github.com/hashicorp/terraform-plugin-framework-validators/stringvalidator"
	"github.com/hashicorp/terraform-plugin-framework/diag"
	"github.com/hashicorp/terraform-plugin-framework/list"
	"github.com/hashicorp/terraform-plugin-framework/list/schema"
	"github.com/hashicorp/terraform-plugin-framework/path"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/schema/validator"
)

var _ list.ListResource = (*listBufos)(nil)

func NewListBufos() list.ListResource {
	return &listBufos{}
}

type listBufos struct{}

func (l *listBufos) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	// This is bufo_bufo... :upside_down_face:
	resp.TypeName = req.ProviderTypeName + "_bufo"
}

func (l *listBufos) ListResourceConfigSchema(_ context.Context, _ list.ListResourceSchemaRequest, resp *list.ListResourceSchemaResponse) {
	resp.Schema = schema.Schema{
		Description: "Lists all available bufos.",
		Attributes: map[string]schema.Attribute{
			"directory": schema.StringAttribute{
				Required:    true,
				Description: "The directory name to retrieve bufos from, currently only 'bufos' is accepted.",
				Validators: []validator.String{
					stringvalidator.OneOf("bufos"),
				},
			},
		},
	}
}

func (l *listBufos) List(ctx context.Context, req list.ListRequest, stream *list.ListResultsStream) {
	var config listBufosModel

	diagsStream := make([]list.ListResult, 0)

	diags := req.Config.Get(ctx, &config)
	if diags.HasError() {
		diagsStream = append(diagsStream, list.ListResult{
			Diagnostics: diags,
		})
		stream.Results = slices.Values(diagsStream)

		return
	}

	dir, err := bufos.ReadDir(config.Directory)
	if err != nil {
		diagsStream = append(diagsStream, list.ListResult{
			Diagnostics: diag.Diagnostics{
				diag.NewErrorDiagnostic("reading bufos directory", "An error occurred reading the bufos directory: "+err.Error()),
			},
		})
		stream.Results = slices.Values(diagsStream)

		return
	}

	stream.Results = func(push func(list.ListResult) bool) {
		for _, entry := range dir {
			if entry.IsDir() {
				// ignore subdirs for now
				continue
			}

			result := req.NewListResult(ctx)

			bufoName := strings.TrimSuffix(entry.Name(), ".png")

			result.DisplayName = bufoName

			if diags := result.Identity.SetAttribute(ctx, path.Root("name"), bufoName); diags.HasError() {
				result.Diagnostics.Append(diags...)
			}

			if diags := result.Resource.SetAttribute(ctx, path.Root("name"), bufoName); diags.HasError() {
				result.Diagnostics.Append(diags...)
			}

			if !push(result) {
				return
			}
		}
	}
}

type listBufosModel struct {
	Directory string `tfsdk:"directory"`
}
