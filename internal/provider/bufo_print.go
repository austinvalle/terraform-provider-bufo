package provider

import (
	"context"
	"fmt"
	"image"
	"math/rand"

	"github.com/hashicorp/terraform-plugin-framework/action"
	"github.com/hashicorp/terraform-plugin-framework/action/schema"
	"github.com/hashicorp/terraform-plugin-framework/schema/validator"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/qeesung/image2ascii/convert"
)

var (
	_ action.Action = (*printBufo)(nil)
)

func NewPrintBufo() action.Action {
	return &printBufo{}
}

type printBufo struct{}

func (a *printBufo) Metadata(ctx context.Context, req action.MetadataRequest, resp *action.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_print"
}

func (a *printBufo) Schema(ctx context.Context, req action.SchemaRequest, resp *action.SchemaResponse) {
	resp.Schema = schema.UnlinkedSchema{
		Description: "Prints an ASCII bufo",
		Attributes: map[string]schema.Attribute{
			"name": schema.StringAttribute{
				Description: "Name of the bufo to print, see: https://bufo.zone/. If no name is provided, a random bufo will be selected!",
				Optional:    true,
				Validators: []validator.String{
					ValidBufoName(),
				},
			},
			"ratio": schema.Float64Attribute{
				Description: "The ratio to scale the width/height of the bufo from the original, defaults to 0.5",
				Optional:    true,
			},
		},
	}
}

func (a *printBufo) Invoke(ctx context.Context, req action.InvokeRequest, resp *action.InvokeResponse) {
	var config printBufoModel

	resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
	if resp.Diagnostics.HasError() {
		return
	}

	var bufoFileName string
	if config.Name.IsNull() {
		// Choose a random bufo
		bufoEntries, err := bufos.ReadDir("bufos")
		if err != nil {
			resp.Diagnostics.AddError(
				"Failed to select a random bufo",
				fmt.Sprintf("There was an issue finding a random bufo: %s", err),
			)
			return
		}

		randomBufoIdx := rand.Intn(len(bufoEntries))
		bufoFileName = bufoEntries[randomBufoIdx].Name()
	} else {
		bufoFileName = fmt.Sprintf("%s.png", config.Name.ValueString())
	}

	bufoLocation := fmt.Sprintf("bufos/%s", bufoFileName)

	bufoFile, err := bufos.Open(bufoLocation)
	if err != nil {
		resp.Diagnostics.AddError(
			"Failed to retrieve bufo",
			fmt.Sprintf("There was an issue finding bufo at %q: %s", bufoFileName, err),
		)
		return
	}

	converter := convert.NewImageConverter()
	img, _, err := image.Decode(bufoFile)
	if err != nil {
		resp.Diagnostics.AddError(
			"Failed to decode bufo",
			fmt.Sprintf("There was an issue decoding bufo at %q: %s", bufoFileName, err),
		)
		return
	}

	ratio := 0.5
	if !config.Ratio.IsNull() {
		ratio = config.Ratio.ValueFloat64()
	}

	bufoAscii := converter.Image2ASCIIString(img, &convert.Options{
		Ratio:       ratio,
		FixedWidth:  -1,
		FixedHeight: -1,
	})

	resp.SendProgress(action.InvokeProgressEvent{
		Message: fmt.Sprintf("\n\nBufo: %q\n\n%s", bufoFileName, bufoAscii),
	})
}

type printBufoModel struct {
	Name  types.String  `tfsdk:"name"`
	Ratio types.Float64 `tfsdk:"ratio"`
}
